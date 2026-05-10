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
    // Cache freshness check — return 304 if data is younger than TTL
    // -------------------------------------------------------------------------
    const existingStats = await readUserStats(userId);

    if (existingStats?.lastSync) {
      const lastSyncDate = new Date(existingStats.lastSync);
      const ageMs = Date.now() - lastSyncDate.getTime();

      if (ageMs < CACHE_TTL_MS) {
        const ageSeconds = Math.round(ageMs / 1000);
        console.info(
          `[strava/sync] 304 Not Modified — last sync was ${ageSeconds}s ago (${existingStats.lastSync})`
        );
        return new NextResponse(null, {
          status: 304,
          headers: {
            "Cache-Control": `public, max-age=${CACHE_TTL_SECONDS}, stale-while-revalidate=${CACHE_TTL_SECONDS}`,
            "Last-Modified": lastSyncDate.toUTCString(),
            "X-Cache": "HIT",
            "X-Last-Sync": existingStats.lastSync,
          },
        });
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

    console.info(
      `[strava/sync] Successful sync for user ${userId} at ${syncTimestamp} — ${activities.length} activities, ${runs.length} runs`
    );

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
        headers: {
          "Cache-Control": `public, max-age=${CACHE_TTL_SECONDS}, stale-while-revalidate=${CACHE_TTL_SECONDS}`,
          "Last-Modified": new Date(syncTimestamp).toUTCString(),
          "X-Cache": "MISS",
          "X-Last-Sync": syncTimestamp,
        },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
