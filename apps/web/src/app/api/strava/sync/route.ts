/**
 * POST /api/strava/sync
 *
 * Full sync — fetches ALL activities and athlete stats from Strava
 * and persists them to Supabase for the currently logged-in user.
 *
 * Also accepts x-user-id header (internal use from callback route).
 */

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAthleteForUser, getAthleteStatsForUser, getAllActivitiesForUser } from "@/lib/strava";
import { computeMetrics, writeUserStats, readUserStats, type StoredStats } from "@/lib/stats-store";
import { createClient } from "@/lib/supabase/server";
import { getAnyStravaUserId } from "@/lib/db/user-strava";

// ---------------------------------------------------------------------------
// Cache constants
// ---------------------------------------------------------------------------

const CACHE_TTL_SECONDS = 5 * 60; // 5 minutes
const CACHE_TTL_MS = CACHE_TTL_SECONDS * 1000;

// ---------------------------------------------------------------------------
// Next.js route segment config — revalidate every 5 minutes
// ---------------------------------------------------------------------------

export const revalidate = CACHE_TTL_SECONDS;

// ---------------------------------------------------------------------------
// Cache helper functions
// ---------------------------------------------------------------------------

/**
 * Generates a simple ETag based on the lastSync timestamp.
 * Converts the ISO timestamp to milliseconds and formats as a hex string.
 */
function generateETag(lastSync: string): string {
  const ms = new Date(lastSync).getTime();
  return `"sync-${ms.toString(16)}"`;
}

/**
 * Checks if the client's If-None-Match header matches the generated ETag.
 * Returns true if the client already has fresh data (=> 304 Not Modified).
 */
function isETagFresh(req: NextRequest, etag: string): boolean {
  const clientETag = req.headers.get("if-none-match");
  return clientETag !== null && clientETag === etag;
}

/**
 * Checks whether existing sync data is still within the TTL window.
 * Returns true if the data is fresher than CACHE_TTL_MS milliseconds.
 */
function isSyncFresh(lastSync: string): boolean {
  const ageMs = Date.now() - new Date(lastSync).getTime();
  return ageMs < CACHE_TTL_MS;
}

/**
 * Builds Cache-Control and related headers for sync responses.
 * Uses 'private' since data is user-specific.
 * Includes stale-while-revalidate so the browser can serve stale data
 * while a background revalidation request is in flight.
 */
function buildCacheHeaders(
  lastSync: string,
  cacheStatus: "HIT" | "MISS"
): Record<string, string> {
  const etag = generateETag(lastSync);
  return {
    "Cache-Control": `private, max-age=${CACHE_TTL_SECONDS}, stale-while-revalidate=${CACHE_TTL_SECONDS}`,
    "ETag": etag,
    "Last-Modified": new Date(lastSync).toUTCString(),
    "X-Cache": cacheStatus,
    "X-Last-Sync": lastSync,
  };
}

/**
 * Builds a 304 Not Modified response with all required cache headers.
 * Centralises the repeated 304 response construction to a single place.
 */
function buildNotModifiedResponse(
  lastSync: string,
  reason: "etag" | "ttl"
): NextResponse {
  const etag = generateETag(lastSync);
  const lastSyncDate = new Date(lastSync);
  const ageSeconds = Math.round((Date.now() - lastSyncDate.getTime()) / 1000);

  console.info(
    `[strava/sync] 304 Not Modified (${
      reason === "etag" ? "ETag match" : `TTL — ${ageSeconds}s ago`
    }) — lastSync: ${lastSync}`
  );

  return new NextResponse(null, {
    status: 304,
    headers: {
      "Cache-Control": `private, max-age=${CACHE_TTL_SECONDS}, stale-while-revalidate=${CACHE_TTL_SECONDS}`,
      "ETag": etag,
      "Last-Modified": lastSyncDate.toUTCString(),
      "X-Cache": "HIT",
      "X-Last-Sync": lastSync,
    },
  });
}

/**
 * Logs a successful sync with timestamp, user, and activity counts.
 */
function logSyncTimestamp(
  userId: string,
  syncTimestamp: string,
  activityCount: number,
  runCount: number
): void {
  console.info(
    `[strava/sync] Successful sync for user ${userId} at ${syncTimestamp} — ${activityCount} activities, ${runCount} runs`
  );
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  // Allow internal calls (from callback) via header, else use session or fallback to first user
  const headerUserId = req.headers.get("x-user-id");
  let userId: string;

  if (headerUserId) {
    userId = headerUserId;
  } else {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      userId = user.id;
    } else {
      // No active session — fall back to the first Strava-connected user (single-user app)
      const fallbackId = await getAnyStravaUserId();
      if (!fallbackId) {
        return NextResponse.json({ error: "No Strava connection found" }, { status: 401 });
      }
      userId = fallbackId;
    }
  }

  try {
    // -------------------------------------------------------------------------
    // Cache freshness check — ETag match or TTL-based early return
    // -------------------------------------------------------------------------
    const existingStats = await readUserStats(userId);

    if (existingStats?.lastSync) {
      const etag = generateETag(existingStats.lastSync);

      // ETag match — client already has identical data, no need to resync
      if (isETagFresh(req, etag)) {
        return buildNotModifiedResponse(existingStats.lastSync, "etag");
      }

      // TTL not expired — data is fresh, skip Strava API call
      if (isSyncFresh(existingStats.lastSync)) {
        return buildNotModifiedResponse(existingStats.lastSync, "ttl");
      }
    }

    // -------------------------------------------------------------------------
    // Full sync
    // -------------------------------------------------------------------------
    const athlete = await getAthleteForUser(userId);

    let stravaStats = null;
    let activities: Awaited<ReturnType<typeof getAllActivitiesForUser>> = [];
    let scopeError: string | null = null;

    try {
      [stravaStats, activities] = await Promise.all([
        getAthleteStatsForUser(userId, athlete.id),
        getAllActivitiesForUser(userId),
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("401") || msg.includes("activity:read_permission")) {
        scopeError = "Token is missing activity:read_all scope. Please reconnect Strava.";
        console.warn("[strava/sync]", scopeError);
        try {
          stravaStats = await getAthleteStatsForUser(userId, athlete.id);
        } catch { /* ignore */ }
      } else {
        throw err;
      }
    }

    const runs = activities
      .filter((a) => a.type === "Run" || a.sport_type === "Run")
      .sort((a, b) => new Date(b.start_date_local).getTime() - new Date(a.start_date_local).getTime());

    const computed = computeMetrics(runs, stravaStats);

    const syncTimestamp = new Date().toISOString();

    const stats: StoredStats = {
      lastSync: syncTimestamp,
      athlete,
      stravaStats,
      recentActivities: activities,
      recentRuns: runs.slice(0, 20),
      computed,
    };

    await writeUserStats(userId, stats);
    revalidatePath("/dashboard");

    logSyncTimestamp(userId, syncTimestamp, activities.length, runs.length);

    return NextResponse.json(
      {
        ok: true,
        activitiesSynced: activities.length,
        runsSynced: runs.length,
        weeklyKm: computed.weeklyKm,
        lastSync: stats.lastSync,
        ...(scopeError ? { warning: scopeError } : {}),
      },
      {
        headers: buildCacheHeaders(syncTimestamp, "MISS"),
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
