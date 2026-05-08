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
