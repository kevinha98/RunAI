/**
 * Client-safe types and pure helpers for Strava stats.
 * No Node.js-only imports (fs, path, etc.) — safe to import in client components.
 */

import type { StravaActivity, StravaAthlete, StravaStats } from "./strava";

export type { StravaActivity, StravaAthlete, StravaStats };

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ComputedMetrics {
  weeklyKm: number;
  weeklyRuns: number;
  avgPaceSecPerKm: number;
  longestRunKm: number;
  totalRunsAllTime: number;
  totalKmAllTime: number;
  ytdKm: number;
}

export interface StoredStats {
  lastSync: string;
  athlete: StravaAthlete | null;
  stravaStats: StravaStats | null;
  recentActivities: StravaActivity[];
  recentRuns: StravaActivity[];
  computed: ComputedMetrics;
}

// ─── Pace Zone Types ─────────────────────────────────────────────────────────

export type PaceZoneLabel = 'Lett' | 'Moderat' | 'Terskel' | 'VO2max';

export interface PaceZone {
  label: PaceZoneLabel;
  bgClass: string;
  textClass: string;
  borderClass: string;
  dotClass: string;
}

// ─── Pace Zone Config ────────────────────────────────────────────────────────

const PACE_ZONES: Record<PaceZoneLabel, PaceZone> = {
  Lett:    { label: 'Lett',    bgClass: 'bg-green-100',  textClass: 'text-green-800',  borderClass: 'border-green-300',  dotClass: 'bg-green-500'  },
  Moderat: { label: 'Moderat', bgClass: 'bg-blue-100',   textClass: 'text-blue-800',   borderClass: 'border-blue-300',   dotClass: 'bg-blue-500'   },
  Terskel: { label: 'Terskel', bgClass: 'bg-orange-100', textClass: 'text-orange-800', borderClass: 'border-orange-300', dotClass: 'bg-orange-500' },
  VO2max:  { label: 'VO2max',  bgClass: 'bg-red-100',    textClass: 'text-red-800',    borderClass: 'border-red-300',    dotClass: 'bg-red-500'    },
};

/**
 * Classify a run's pace into a training zone relative to the user's average pace.
 *
 * Zone boundaries (relative to avgPaceSecPerKm — higher sec/km = slower):
 *   Lett     : secPerKm > avg * 1.10   (easy / recovery)
 *   Moderat  : avg * 1.00 <= secPerKm <= avg * 1.10
 *   Terskel  : avg * 0.88 <= secPerKm < avg * 1.00
 *   VO2max   : secPerKm < avg * 0.88    (hard / race pace)
 *
 * @param secPerKm        - The run's average pace in seconds per km
 * @param avgPaceSecPerKm - The user's overall average pace in seconds per km
 * @returns PaceZone object with label and Tailwind classes
 */
export function classifyPaceZone(
  secPerKm: number,
  avgPaceSecPerKm: number
): PaceZone {
  if (!secPerKm || secPerKm <= 0 || !avgPaceSecPerKm || avgPaceSecPerKm <= 0) {
    return PACE_ZONES['Moderat'];
  }
  if (secPerKm > avgPaceSecPerKm * 1.10) return PACE_ZONES['Lett'];
  if (secPerKm >= avgPaceSecPerKm * 1.00) return PACE_ZONES['Moderat'];
  if (secPerKm >= avgPaceSecPerKm * 0.88) return PACE_ZONES['Terskel'];
  return PACE_ZONES['VO2max'];
}

// ─── Zone Distribution ───────────────────────────────────────────────────────

export interface ZoneDistribution {
  zone: PaceZone;
  count: number;
  percentage: number;
}

/**
 * Computes distribution of pace zones for the last N runs.
 *
 * @param runs            - Array of StravaActivity (recent runs)
 * @param avgPaceSecPerKm - User's overall average pace in sec/km
 * @param limit           - How many recent runs to include (default 10)
 * @returns Array of ZoneDistribution sorted by zone order (Lett → VO2max)
 */
export function computePaceZoneDistribution(
  runs: StravaActivity[],
  avgPaceSecPerKm: number,
  limit = 10
): ZoneDistribution[] {
  const zoneOrder: PaceZoneLabel[] = ['Lett', 'Moderat', 'Terskel', 'VO2max'];
  const counts: Record<PaceZoneLabel, number> = {
    Lett: 0,
    Moderat: 0,
    Terskel: 0,
    VO2max: 0,
  };

  const recent = runs.slice(0, limit);
  const total = recent.length;

  for (const run of recent) {
    const secPerKm =
      run.distance > 0 && run.moving_time > 0
        ? run.moving_time / (run.distance / 1000)
        : 0;
    const zone = classifyPaceZone(secPerKm, avgPaceSecPerKm);
    counts[zone.label] += 1;
  }

  return zoneOrder.map((label) => ({
    zone: PACE_ZONES[label],
    count: counts[label],
    percentage: total > 0 ? Math.round((counts[label] / total) * 100) : 0,
  }));
}

// ─── Computed Metrics ────────────────────────────────────────────────────────

/**
 * Compute dashboard metrics from recent runs and Strava stats.
 *
 * - weeklyKm / weeklyRuns : activities whose start_date falls within the last 7 days
 * - avgPaceSecPerKm       : distance-weighted average pace across all supplied runs
 * - longestRunKm          : longest single run (by distance) in the supplied list
 * - totalRunsAllTime      : from StravaStats.all_run_totals (0 if stats is null)
 * - totalKmAllTime        : from StravaStats.all_run_totals.distance in km (0 if stats is null)
 * - ytdKm                 : from StravaStats.ytd_run_totals.distance in km (0 if stats is null)
 *
 * @param runs  - Array of StravaActivity (typically recentRuns)
 * @param stats - StravaStats from the API, or null when unavailable
 * @returns ComputedMetrics
 */
export function computeMetrics(
  runs: StravaActivity[],
  stats: StravaStats | null
): ComputedMetrics {
  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  // ── Weekly aggregates ────────────────────────────────────────────────────
  let weeklyKm = 0;
  let weeklyRuns = 0;

  for (const run of runs) {
    const startMs = new Date(run.start_date).getTime();
    if (now - startMs <= sevenDaysMs) {
      weeklyKm += run.distance / 1000;
      weeklyRuns += 1;
    }
  }

  // ── Average pace (distance-weighted) ────────────────────────────────────
  let totalDistanceM = 0;
  let totalMovingTimeSec = 0;

  for (const run of runs) {
    if (run.distance > 0 && run.moving_time > 0) {
      totalDistanceM += run.distance;
      totalMovingTimeSec += run.moving_time;
    }
  }

  const avgPaceSecPerKm =
    totalDistanceM > 0
      ? totalMovingTimeSec / (totalDistanceM / 1000)
      : 0;

  // ── Longest run ──────────────────────────────────────────────────────────
  const longestRunKm =
    runs.length > 0
      ? Math.max(...runs.map((r) => r.distance / 1000))
      : 0;

  // ── All-time and YTD from StravaStats ────────────────────────────────────
  const totalRunsAllTime = stats?.all_run_totals?.count ?? 0;
  const totalKmAllTime = stats?.all_run_totals?.distance
    ? stats.all_run_totals.distance / 1000
    : 0;
  const ytdKm = stats?.ytd_run_totals?.distance
    ? stats.ytd_run_totals.distance / 1000
    : 0;

  return {
    weeklyKm: Math.round(weeklyKm * 10) / 10,
    weeklyRuns,
    avgPaceSecPerKm: Math.round(avgPaceSecPerKm),
    longestRunKm: Math.round(longestRunKm * 10) / 10,
    totalRunsAllTime,
    totalKmAllTime: Math.round(totalKmAllTime * 10) / 10,
    ytdKm: Math.round(ytdKm * 10) / 10,
  };
}

// ─── Pure formatting helpers — safe for client components ───────────────────

/** Convert seconds-per-km to "M:SS" string, e.g. 321 → "5:21" */
export function formatPace(secPerKm: number): string {
  if (!secPerKm || secPerKm <= 0) return "—";
  const mins = Math.floor(secPerKm / 60);
  const secs = Math.round(secPerKm % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/** Convert seconds to "H:MM:SS" or "MM:SS" */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
