/**
 * Database layer for per-user Strava data.
 * Uses the service-role client so it works in both session and webhook contexts.
 */

import { createServiceClient } from "@/lib/supabase/service";
import type { StravaAthlete, StravaActivity, StravaStats, StravaTokens } from "@/lib/strava";
import type { ComputedMetrics } from "@/lib/strava-types";

// ─── Row shape (mirrors the DB table) ────────────────────────────────────────

export interface UserStravaRow {
  user_id: string;
  strava_athlete_id: number | null;
  access_token: string;
  refresh_token: string;
  token_expires_at: number;
  athlete: StravaAthlete | null;
  strava_stats: StravaStats | null;
  recent_runs: StravaActivity[];
  recent_activities: StravaActivity[];
  computed: ComputedMetrics | null;
  last_sync: string | null;
}

// ─── Read ────────────────────────────────────────────────────────────────────

export async function getUserStrava(userId: string): Promise<UserStravaRow | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("user_strava")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // row not found
    console.error("[db/user-strava] getUserStrava error:", error.message);
    return null;
  }

  return data as UserStravaRow;
}

// ─── Look up user_id by Strava athlete ID (for webhook) ──────────────────────

export async function getUserIdByStravaAthleteId(
  stravaAthleteId: number
): Promise<string | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("user_strava")
    .select("user_id")
    .eq("strava_athlete_id", stravaAthleteId)
    .single();

  if (error || !data) return null;
  return (data as { user_id: string }).user_id;
}

// ─── Write ────────────────────────────────────────────────────────────────────

export type UserStravaUpdate = Partial<Omit<UserStravaRow, "user_id">>;

export async function upsertUserStrava(
  userId: string,
  data: UserStravaUpdate & Pick<StravaTokens, "access_token" | "refresh_token"> & { token_expires_at: number }
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("user_strava")
    .upsert(
      { user_id: userId, ...data },
      { onConflict: "user_id" }
    );

  if (error) {
    console.error("[db/user-strava] upsertUserStrava error:", error.message);
    throw new Error(`Failed to save Strava data: ${error.message}`);
  }
}

export async function updateUserStravaStats(
  userId: string,
  data: Partial<Pick<UserStravaRow, "athlete" | "strava_stats" | "recent_runs" | "recent_activities" | "computed" | "last_sync">>
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("user_strava")
    .update(data)
    .eq("user_id", userId);

  if (error) {
    console.error("[db/user-strava] updateUserStravaStats error:", error.message);
    throw new Error(`Failed to update Strava stats: ${error.message}`);
  }
}
