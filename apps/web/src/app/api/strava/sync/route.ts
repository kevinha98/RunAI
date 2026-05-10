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
import { computeMetrics, writeUserStats, type StoredStats } from "@/lib/stats-store";
import { createClient } from "@/lib/supabase/server";
import { getAnyStravaUserId } from "@/lib/db/user-strava";

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

    const runs = activities.filter(
      (a) => a.type === "Run" || a.sport_type === "Run"
    );

    const computed = computeMetrics(runs, stravaStats);

    const stats: StoredStats = {
      lastSync: new Date().toISOString(),
      athlete,
      stravaStats,
      recentActivities: activities,
      recentRuns: runs.slice(0, 20),
      computed,
    };

    await writeUserStats(userId, stats);
    revalidatePath("/dashboard");

    return NextResponse.json({
      ok: true,
      activitiesSynced: activities.length,
      runsSynced: runs.length,
      weeklyKm: computed.weeklyKm,
      lastSync: stats.lastSync,
      ...(scopeError ? { warning: scopeError } : {}),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}



