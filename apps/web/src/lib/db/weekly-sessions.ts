/**
 * Database helpers for weekly_sessions table.
 * Stores per-user, per-week session plans with completion state + comments.
 */

import { createServiceClient } from "@/lib/supabase/service";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SessionEntry {
  id: string;
  day: string;          // Man | Tir | Ons | Tor | Fre | Lør | Søn
  type: string;
  distance: string;
  pace: string;
  icon: string;
  completed: boolean;
  completedDay: string | null;  // Which day it was actually done
  comment: string;
}

export type WeekSource = "plan" | "llm" | "manual";

export interface WeekSessions {
  id: string;
  userId: string;
  weekNumber: number;
  sessions: SessionEntry[];
  source: WeekSource;
  createdAt: string;
  updatedAt: string;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getWeekSessions(
  userId: string,
  weekNumber: number
): Promise<WeekSessions | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("weekly_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("week_number", weekNumber)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    userId: data.user_id,
    weekNumber: data.week_number,
    sessions: (data.sessions as SessionEntry[]) ?? [],
    source: (data.source as WeekSource) ?? "plan",
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function getAllWeekSessions(
  userId: string
): Promise<WeekSessions[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("weekly_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("week_number", { ascending: true });

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    userId: row.user_id,
    weekNumber: row.week_number,
    sessions: (row.sessions as SessionEntry[]) ?? [],
    source: (row.source as WeekSource) ?? "plan",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function saveWeekSessions(
  userId: string,
  weekNumber: number,
  sessions: SessionEntry[],
  source: WeekSource = "manual"
): Promise<WeekSessions | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("weekly_sessions")
    .upsert(
      {
        user_id: userId,
        week_number: weekNumber,
        sessions,
        source,
      },
      { onConflict: "user_id,week_number" }
    )
    .select()
    .single();

  if (error || !data) {
    console.error("[db/weekly-sessions] saveWeekSessions error:", error?.message);
    return null;
  }

  return {
    id: data.id,
    userId: data.user_id,
    weekNumber: data.week_number,
    sessions: (data.sessions as SessionEntry[]) ?? [],
    source: (data.source as WeekSource) ?? "manual",
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}
