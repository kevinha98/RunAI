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

/**
 * Formats a pace zone distribution as a human-readable percentage summary
 * suitable for UI widgets (e.g. ukerapport-widget).
 * Only zones with at least one run are included.
 * Zones are listed in order from Lett → VO2max.
 *
 * @param distribution - Output from computePaceZoneDistribution()
 * @returns E.g. '60% Lett · 25% Moderat · 15% Terskel'
 *
 * @example
 * const dist = computePaceZoneDistribution(runs, avgPace);
 * formatZoneSummary(dist); // '60% Lett · 25% Moderat · 15% Terskel'
 */
export function formatZoneSummary(distribution: ZoneDistribution[]): string {
  const parts = distribution
    .filter((entry) => entry.count > 0)
    .map((entry) => `${entry.percentage}% ${entry.zone.label}`);

  return parts.length > 0 ? parts.join(' · ') : 'Ingen løpsdata';
}

/**
 * Summarizes pace zone distribution as a human-readable percentage string
 * intended for use in AI coach system prompts to convey training balance
 * without sending raw activity data.
 *
 * Only zones with at least one run are included, listed in order Lett → VO2max.
 * Zone labels are lowercase for natural Norwegian sentence flow.
 *
 * @param distribution - Output from computePaceZoneDistribution()
 * @returns E.g. '60% lett, 25% moderat, 15% terskel'
 *
 * @example
 * const dist = computePaceZoneDistribution(runs, avgPace);
 * summarizePaceZones(dist); // '60% lett, 25% moderat, 15% terskel'
 */
export function summarizePaceZones(distribution: ZoneDistribution[]): string {
  if (!distribution || distribution.length === 0) {
    return 'ingen løpsdata tilgjengelig';
  }

  const parts = distribution
    .filter((entry) => entry.count > 0)
    .map((entry) => `${entry.percentage}% ${entry.zone.label.toLowerCase()}`);

  return parts.length > 0 ? parts.join(', ') : 'ingen løpsdata tilgjengelig';
}

/**
 * Convenience helper: computes pace zone distribution from runs and returns
 * a human-readable summary string in one call.
 *
 * Uses '·'-separated format with Title Case labels (suitable for UI widgets
 * and ukerapport display). For AI coach prompts use summarizePaceZones() instead.
 *
 * @param runs            - Array of StravaActivity (recent runs)
 * @param avgPaceSecPerKm - User's overall average pace in sec/km
 * @param limit           - How many recent runs to include (default 10)
 * @returns E.g. '60% Lett · 25% Moderat · 15% Terskel'
 *
 * @example
 * computeAndFormatZoneSummary(stravaData.recentRuns, stravaData.computed.avgPaceSecPerKm);
 * // => '60% Lett · 25% Moderat · 15% Terskel'
 */
export function computeAndFormatZoneSummary(
  runs: StravaActivity[],
  avgPaceSecPerKm: number,
  limit = 10
): string {
  const distribution = computePaceZoneDistribution(runs, avgPaceSecPerKm, limit);
  return formatZoneSummary(distribution);
}

// ─── HR Zone Types ───────────────────────────────────────────────────────────

export type HRZoneLabel =
  | 'Z1 Restitusjon'
  | 'Z2 Aerob'
  | 'Z3 Tempo'
  | 'Z4 Terskel'
  | 'Z5 Maks';

export interface HRZone {
  label: HRZoneLabel;
  description: string;
  /** Lower bound as % of maxHR (inclusive) */
  minPct: number;
  /** Upper bound as % of maxHR (exclusive, except Z5 which is open-ended) */
  maxPct: number;
  bgClass: string;
  textClass: string;
  borderClass: string;
  dotClass: string;
  barClass: string;
}

export interface HRZoneDistribution {
  zone: HRZone;
  count: number;
  percentage: number;
}

// ─── HR Zone Distribution Entry (for stacked bar chart) ──────────────────────

export interface HRZoneDistributionEntry {
  zone: HRZone;
  label: HRZoneLabel;
  /** Total minutes spent in this zone across all qualifying runs */
  minutes: number;
  /** Percentage of total HR-tracked minutes in this zone (0–100) */
  pct: number;
}

// ─── HR Zone Config ───────────────────────────────────────────────────────────

/**
 * Default max HR using 220-age formula, standardised to age 35 if unknown.
 * 220 - 35 = 185 bpm
 */
export const DEFAULT_MAX_HR = 185;

/**
 * Standard 5-zone HR model based on % of max heart rate.
 *
 * Z1 Restitusjon : <60%  — Active recovery
 * Z2 Aerob       : 60-70% — Aerobic base building
 * Z3 Tempo       : 70-80% — Tempo / endurance
 * Z4 Terskel     : 80-90% — Lactate threshold
 * Z5 Maks        : >90%  — VO2max / max effort
 */
const HR_ZONES: Record<HRZoneLabel, HRZone> = {
  'Z1 Restitusjon': {
    label: 'Z1 Restitusjon',
    description: 'Aktiv restitusjon',
    minPct: 0,
    maxPct: 60,
    bgClass: 'bg-sky-100',
    textClass: 'text-sky-800',
    borderClass: 'border-sky-300',
    dotClass: 'bg-sky-400',
    barClass: 'bg-sky-400',
  },
  'Z2 Aerob': {
    label: 'Z2 Aerob',
    description: 'Aerob base',
    minPct: 60,
    maxPct: 70,
    bgClass: 'bg-green-100',
    textClass: 'text-green-800',
    borderClass: 'border-green-300',
    dotClass: 'bg-green-500',
    barClass: 'bg-green-500',
  },
  'Z3 Tempo': {
    label: 'Z3 Tempo',
    description: 'Tempoutholdenhet',
    minPct: 70,
    maxPct: 80,
    bgClass: 'bg-yellow-100',
    textClass: 'text-yellow-800',
    borderClass: 'border-yellow-300',
    dotClass: 'bg-yellow-500',
    barClass: 'bg-yellow-500',
  },
  'Z4 Terskel': {
    label: 'Z4 Terskel',
    description: 'Laktatterskelen',
    minPct: 80,
    maxPct: 90,
    bgClass: 'bg-orange-100',
    textClass: 'text-orange-800',
    borderClass: 'border-orange-300',
    dotClass: 'bg-orange-500',
    barClass: 'bg-orange-500',
  },
  'Z5 Maks': {
    label: 'Z5 Maks',
    description: 'VO2max / Maks innsats',
    minPct: 90,
    maxPct: Infinity,
    bgClass: 'bg-red-100',
    textClass: 'text-red-800',
    borderClass: 'border-red-300',
    dotClass: 'bg-red-500',
    barClass: 'bg-red-500',
  },
};

/** Ordered zone labels from easiest to hardest */
const HR_ZONE_ORDER: HRZoneLabel[] = [
  'Z1 Restitusjon',
  'Z2 Aerob',
  'Z3 Tempo',
  'Z4 Terskel',
  'Z5 Maks',
];

/**
 * Classify a single heart rate value into an HR zone.
 *
 * @param bpm   - Heart rate in beats per minute
 * @param maxHR - Athlete's maximum heart rate (default: 185 = 220 - 35)
 * @returns HRZone object with label and Tailwind classes
 */
export function classifyHeartRateZone(
  bpm: number,
  maxHR: number = DEFAULT_MAX_HR
): HRZone {
  if (!bpm || bpm <= 0 || !maxHR || maxHR <= 0) {
    return HR_ZONES['Z2 Aerob'];
  }

  const pct = (bpm / maxHR) * 100;

  if (pct < 60) return HR_ZONES['Z1 Restitusjon'];
  if (pct < 70) return HR_ZONES['Z2 Aerob'];
  if (pct < 80) return HR_ZONES['Z3 Tempo'];
  if (pct < 90) return HR_ZONES['Z4 Terskel'];
  return HR_ZONES['Z5 Maks'];
}

/**
 * Computes HR zone distribution (minutes and percentage) for a list of runs.
 *
 * Each run is classified into one of 5 Garmin HR zones based on its
 * average_heartrate relative to maxHR. The run's moving_time (seconds)
 * is attributed entirely to that zone.
 *
 * Only runs with a valid average_heartrate and positive moving_time are included.
 *
 * @param runs  - Array of StravaActivity
 * @param maxHR - Athlete's max heart rate (default: DEFAULT_MAX_HR = 185)
 * @returns Array of HRZoneDistributionEntry ordered Z1 → Z5
 */
export function computeHeartRateZoneDistribution(
  runs: StravaActivity[],
  maxHR: number = DEFAULT_MAX_HR
): HRZoneDistributionEntry[] {
  const minutesPerZone: Record<HRZoneLabel, number> = {
    'Z1 Restitusjon': 0,
    'Z2 Aerob': 0,
    'Z3 Tempo': 0,
    'Z4 Terskel': 0,
    'Z5 Maks': 0,
  };

  let totalMinutes = 0;

  for (const run of runs) {
    const hr = run.average_heartrate;
    if (!hr || hr <= 0) continue;

    const movingMinutes = run.moving_time > 0 ? run.moving_time / 60 : 0;
    if (movingMinutes <= 0) continue;

    const zone = classifyHeartRateZone(hr, maxHR);
    minutesPerZone[zone.label] += movingMinutes;
    totalMinutes += movingMinutes;
  }

  return HR_ZONE_ORDER.map((label) => {
    const rawMinutes = minutesPerZone[label];
    const minutes = Math.round(rawMinutes);
    const pct =
      totalMinutes > 0
        ? Math.round((rawMinutes / totalMinutes) * 100)
        : 0;
    return {
      zone: HR_ZONES[label],
      label,
      minutes,
      pct,
    };
  });
}

// ─── Training Load Types ─────────────────────────────────────────────────────

export interface TrainingLoad {
  /** Acute Training Load: total km run in the last 7 days */
  atl: number;
  /** Chronic Training Load: average weekly km over the last 28 days (total km / 4 weeks) */
  ctl: number;
  /** Training Stress Balance: ctl - atl (positive = fresh/good form, negative = fatigued) */
  tsb: number;
}

/**
 * Computes Acute Training Load (ATL), Chronic Training Load (CTL),
 * and Training Stress Balance (TSB) from recent runs.
 *
 * - ATL = total km run in the last 7 days
 * - CTL = average weekly km over the last 28 days (total km in 28d / 4 weeks)
 * - TSB = CTL - ATL  (positive → fresh/good form, negative → fatigued/overloaded)
 *
 * @param runs - Array of StravaActivity (should include runs from at least last 28 days)
 * @returns TrainingLoad object with atl, ctl, tsb rounded to 1 decimal
 */
export function computeTrainingLoad(runs: StravaActivity[]): TrainingLoad {
  const now = Date.now();
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const cutoff7  = now - 7  * MS_PER_DAY;
  const cutoff28 = now - 28 * MS_PER_DAY;

  let kmLast7  = 0;
  let kmLast28 = 0;

  for (const run of runs) {
    if (!run.start_date) continue;

    const runTime = new Date(run.start_date).getTime();
    if (isNaN(runTime)) continue;

    // Skip future activities
    if (runTime > now) continue;

    const distanceKm = (run.distance ?? 0) / 1000;

    if (runTime >= cutoff28) {
      kmLast28 += distanceKm;
    }
    if (runTime >= cutoff7) {
      kmLast7 += distanceKm;
    }
  }

  const atl = Math.round(kmLast7 * 10) / 10;
  const ctl = Math.round((kmLast28 / 4) * 10) / 10;
  const tsb = Math.round((ctl - atl) * 10) / 10;

  return { atl, ctl, tsb };
}

// ─── ACWR Types ──────────────────────────────────────────────────────────────

/**
 * Training load status derived from the Acute:Chronic Workload Ratio.
 *
 * - 'Trygg'      : ratio < 0.8  (under-loading / fresh)
 * - 'Optimal'    : 0.8 <= ratio <= 1.3  (sweet spot)
 * - 'Høy risiko' : ratio > 1.3  (overloading / injury risk)
 */
export type ACWRStatus = 'Trygg' | 'Optimal' | 'Høy risiko';

export interface ACWRResult {
  /** Acute load: km run in the most recent ISO week */
  acuteKm: number;
  /** Chronic load: average km per week over the last 4 ISO weeks */
  chronicKm: number;
  /** Acute / Chronic ratio (0 if chronic is 0) */
  ratio: number;
  /** Weekly km for each of the last 4 weeks, oldest first */
  weeklyKm: number[];
  /** ISO week keys for the last 4 weeks, oldest first (e.g. '2025-W22') */
  weekKeys: string[];
  /** Training load status derived from the ratio */
  status: ACWRStatus;
}

// ─── ISO Week Helper ─────────────────────────────────────────────────────────

/**
 * Returns an ISO 8601 week key string for a given date.
 * Format: 'YYYY-Www'  e.g. '2025-W22'
 *
 * Algorithm follows ISO 8601: week 1 is the week containing the first Thursday.
 * Monday is the first day of the week.
 *
 * @param date - Any JS Date
 * @returns ISO week key string
 */
export function getISOWeekKey(date: Date): string {
  // Work in UTC to avoid DST issues
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  // ISO: Monday=1 … Sunday=7; getUTCDay returns 0=Sun … 6=Sat
  const day = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
  // Shift to nearest Thursday (ISO weeks belong to the year of their Thursday)
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

// ─── ACWR Computation ────────────────────────────────────────────────────────

/**
 * Compute the Acute:Chronic Workload Ratio (ACWR) from recent runs.
 *
 * Groups runs by ISO 8601 week key and considers only the 4 most recent
 * ISO weeks relative to today.
 *
 * - Acute  = km run in the most recent ISO week (current week)
 * - Chronic = average km/week across the last 4 ISO weeks (including weeks with 0 km)
 * - Ratio  = acute / chronic  (returns 0 when chronic === 0)
 *
 * Status thresholds (industry standard ACWR):
 *   ratio < 0.8              → 'Trygg'      (under-training / fresh)
 *   0.8 <= ratio <= 1.3      → 'Optimal'    (sweet spot)
 *   ratio > 1.3              → 'Høy risiko' (injury risk zone)
 *
 * @param recentRuns - Array of StravaActivity (only running activities)
 * @returns ACWRResult with ratio, status, per-week km breakdown (oldest → newest)
 *
 * @example
 * const result = computeACWR(storedStats.recentRuns);
 * // result.status === 'Optimal'
 * // result.ratio  === 1.05
 * // result.weekKeys === ['2025-W19', '2025-W20', '2025-W21', '2025-W22']
 */
export function computeACWR(recentRuns: StravaActivity[]): ACWRResult {
  const today = new Date();

  // Build the 4 ISO week keys we care about, oldest first (3 weeks ago → current week)
  const weekKeys: string[] = [];
  for (let offset = 3; offset >= 0; offset--) {
    const d = new Date(today);
    d.setDate(d.getDate() - offset * 7);
    weekKeys.push(getISOWeekKey(d));
  }

  // Initialise km buckets for each week
  const kmPerWeek: Record<string, number> = {};
  for (const key of weekKeys) {
    kmPerWeek[key] = 0;
  }

  // Accumulate km from runs that fall into one of the 4 weeks
  for (const run of recentRuns) {
    if (!run.start_date) continue;
    const runDate = new Date(run.start_date);
    if (isNaN(runDate.getTime())) continue;
    const weekKey = getISOWeekKey(runDate);
    if (weekKey in kmPerWeek) {
      kmPerWeek[weekKey] += (run.distance ?? 0) / 1000;
    }
  }

  // Build weeklyKm array (oldest → newest), rounded to 1 decimal
  const weeklyKm = weekKeys.map((key) => Math.round(kmPerWeek[key] * 10) / 10);

  // Acute = most recent week (last element)
  const acuteKm = Math.round(kmPerWeek[weekKeys[3]] * 10) / 10;

  // Chronic = average over all 4 weeks
  const totalKm4Weeks = weeklyKm.reduce((sum, km) => sum + km, 0);
  const chronicKm = Math.round((totalKm4Weeks / 4) * 10) / 10;

  // Ratio
  const rawRatio = chronicKm > 0 ? acuteKm / chronicKm : 0;
  const ratio = Math.round(rawRatio * 100) / 100;

  // Status
  let status: ACWRStatus;
  if (rawRatio > 1.3) {
    status = 'Høy risiko';
  } else if (rawRatio >= 0.8) {
    status = 'Optimal';
  } else {
    status = 'Trygg';
  }

  return {
    acuteKm,
    chronicKm,
    ratio,
    weeklyKm,
    weekKeys,
    status,
  };
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

// ─── Personal Bests ──────────────────────────────────────────────────────────

export interface PersonalBestEntry {
  /** moving_time in seconds */
  time: number;
  /** ISO date string from start_date_local (falls back to start_date) */
  date: string;
}

export interface PersonalBests {
  /** Fastest moving_time (seconds) for 5 km runs. 0 if no qualifying run. */
  fiveKm: number;
  /** ISO date of the 5 km PR run. Empty string if no qualifying run. */
  fiveKmDate: string;
  /** Fastest moving_time (seconds) for 10 km runs. 0 if no qualifying run. */
  tenKm: number;
  /** ISO date of the 10 km PR run. Empty string if no qualifying run. */
  tenKmDate: string;
  /** Distance of the longest single run in kilometres. 0 if no runs. */
  longestKm: number;
}

/**
 * Computes personal bests from an array of Strava run activities.
 *
 * - fiveKm    : Fastest moving_time among runs with distance in [4 250 m, 5 750 m] (5 000 m ± 15%)
 * - tenKm     : Fastest moving_time among runs with distance in [8 500 m, 11 500 m] (10 000 m ± 15%)
 * - longestKm : Distance of the longest single run in kilometres
 *
 * @param runs - Array of StravaActivity representing runs
 * @returns PersonalBests object
 */
export function computePersonalBests(runs: StravaActivity[]): PersonalBests {
  const FIVE_KM = 5_000;
  const TEN_KM = 10_000;
  const TOLERANCE = 0.15;

  const fiveKmLow  = FIVE_KM * (1 - TOLERANCE);  // 4 250
  const fiveKmHigh = FIVE_KM * (1 + TOLERANCE);  // 5 750
  const tenKmLow   = TEN_KM  * (1 - TOLERANCE);  // 8 500
  const tenKmHigh  = TEN_KM  * (1 + TOLERANCE);  // 11 500

  let fiveBestTime = 0;
  let fiveBestDate = '';
  let tenBestTime = 0;
  let tenBestDate = '';
  let longestM = 0;

  for (const run of runs) {
    const dist = run.distance;
    const time = run.moving_time;

    if (!dist || dist <= 0 || !time || time <= 0) continue;

    // Use start_date_local if available, fall back to start_date
    const date = run.start_date_local ?? run.start_date ?? '';

    // Longest run
    if (dist > longestM) {
      longestM = dist;
    }

    // 5 km PR — fastest (lowest moving_time)
    if (dist >= fiveKmLow && dist <= fiveKmHigh) {
      if (fiveBestTime === 0 || time < fiveBestTime) {
        fiveBestTime = time;
        fiveBestDate = date;
      }
    }

    // 10 km PR — fastest (lowest moving_time)
    if (dist >= tenKmLow && dist <= tenKmHigh) {
      if (tenBestTime === 0 || time < tenBestTime) {
        tenBestTime = time;
        tenBestDate = date;
      }
    }
  }

  return {
    fiveKm: fiveBestTime,
    fiveKmDate: fiveBestDate,
    tenKm: tenBestTime,
    tenKmDate: tenBestDate,
    longestKm: Math.round((longestM / 1000) * 100) / 100,
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
