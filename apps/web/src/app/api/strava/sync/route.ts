/**
 * POST /api/strava/sync
 *
 * Full sync — fetches the latest 50 activities and athlete stats from Strava
 * and persists them to the local stats store.
 *
 * Call this once manually after connecting Strava to seed the stats file.
 * After that, the webhook keeps everything up to date automatically.
 */

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAthlete, getAthleteStats, getActivities } from "@/lib/strava";
import { writeStats, computeMetrics, type StoredStats } from "@/lib/stats-store";

export async function POST() {
  try {
    const athlete = await getAthlete();

    // Fetch stats and activities in parallel, but don't let activities failure break everything
    let stravaStats = null;
    let activities: Awaited<ReturnType<typeof getActivities>> = [];
    let scopeError: string | null = null;

    try {
      [stravaStats, activities] = await Promise.all([
        getAthleteStats(athlete.id),
        getActivities({ perPage: 50 }),
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("401") || msg.includes("activity:read_permission")) {
        // Token doesn't have activity scope — re-auth needed
        scopeError =
          "Token is missing activity:read_all scope. Visit /api/strava/connect to re-authorize.";
        console.warn("[strava/sync]", scopeError);
        // Still try to get athlete stats with read scope
        try {
          stravaStats = await getAthleteStats(athlete.id);
        } catch {
          // ignore
        }
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

    writeStats(stats);
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
