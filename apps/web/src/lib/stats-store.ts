/**
 * File-based stats store — persists Strava data between requests.
 *
 * Data is stored at: <project-root>/data/strava-stats.json
 *
 * This is intentionally simple for a single-athlete app.
 * Swap readStats/writeStats for Supabase queries when you add multi-user support.
 *
 * NOTE: On Vercel the filesystem is read-only except for /tmp.
 * For production, replace with database writes (Supabase, Prisma, etc.)
 */

import fs from "fs";
import path from "path";
import type { StravaActivity } from "./strava";
import type { StoredStats, ComputedMetrics, StravaStats } from "./strava-types";
import { formatPace, formatDuration } from "./strava-types";

export type { StoredStats, ComputedMetrics };
export { formatPace, formatDuration };

// ─── Storage path ───────────────────────────────────────────────────────────

function getStorePath(): string {
  // cwd() = apps/web when run via Next.js dev/build
  const dir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, "strava-stats.json");
}

const EMPTY_STATS: StoredStats = {
  lastSync: "",
  athlete: null,
  stravaStats: null,
  recentActivities: [],
  recentRuns: [],
  computed: {
    weeklyKm: 0,
    weeklyRuns: 0,
    avgPaceSecPerKm: 0,
    longestRunKm: 0,
    totalRunsAllTime: 0,
    totalKmAllTime: 0,
    ytdKm: 0,
  },
};

// ─── Read / Write ────────────────────────────────────────────────────────────

export function readStats(): StoredStats {
  try {
    const raw = fs.readFileSync(getStorePath(), "utf8");
    return JSON.parse(raw) as StoredStats;
  } catch {
    return EMPTY_STATS;
  }
}

export function writeStats(stats: StoredStats): void {
  fs.writeFileSync(getStorePath(), JSON.stringify(stats, null, 2), "utf8");
}

// ─── Compute metrics from raw activity list ──────────────────────────────────

export function computeMetrics(
  runs: StravaActivity[],
  stravaStats: StravaStats | null
): ComputedMetrics {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay()); // Sunday
  weekStart.setHours(0, 0, 0, 0);

  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);

  const thisWeekRuns = runs.filter(
    (a) => new Date(a.start_date_local) >= weekStart
  );

  const last5Runs = runs.slice(0, 5).filter((a) => a.distance > 0 && a.moving_time > 0);
  const avgPaceSecPerKm =
    last5Runs.length > 0
      ? last5Runs.reduce((sum, a) => sum + a.moving_time / (a.distance / 1000), 0) /
        last5Runs.length
      : 0;

  const last30DaysRuns = runs.filter(
    (a) => new Date(a.start_date_local) >= thirtyDaysAgo
  );
  const longestRunKm =
    last30DaysRuns.length > 0
      ? Math.max(...last30DaysRuns.map((a) => a.distance / 1000))
      : 0;

  const weeklyKm = thisWeekRuns.reduce((sum, a) => sum + a.distance / 1000, 0);

  return {
    weeklyKm: Math.round(weeklyKm * 10) / 10,
    weeklyRuns: thisWeekRuns.length,
    avgPaceSecPerKm: Math.round(avgPaceSecPerKm),
    longestRunKm: Math.round(longestRunKm * 10) / 10,
    totalRunsAllTime: stravaStats?.all_run_totals?.count ?? 0,
    totalKmAllTime: Math.round((stravaStats?.all_run_totals?.distance ?? 0) / 10) / 100,
    ytdKm: Math.round((stravaStats?.ytd_run_totals?.distance ?? 0) / 10) / 100,
  };
}


