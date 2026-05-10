/**
 * Database helpers for weekly_checkins table.
 */

import { createServiceClient } from "@/lib/supabase/service";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlanAdjustment {
  day: string;
  original: string;
  adjusted: string;
  reason: string;
}

export interface WeeklyCheckin {
  id: string;
  userId: string;
  weekNumber: number;
  weekDate: string;
  userReport: string;
  llmAnalysis: string;
  adjustments: PlanAdjustment[];
  createdAt: string;
}

export interface SaveCheckinInput {
  userId: string;
  weekNumber: number;
  weekDate: string;
  userReport: string;
  llmAnalysis: string;
  adjustments: PlanAdjustment[];
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getUserCheckins(userId: string, limit = 10): Promise<WeeklyCheckin[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("weekly_checkins")
    .select("*")
    .eq("user_id", userId)
    .order("week_number", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    userId: row.user_id,
    weekNumber: row.week_number,
    weekDate: row.week_date,
    userReport: row.user_report,
    llmAnalysis: row.llm_analysis,
    adjustments: (row.adjustments as PlanAdjustment[]) ?? [],
    createdAt: row.created_at,
  }));
}

export async function getCheckinById(userId: string, id: string): Promise<WeeklyCheckin | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("weekly_checkins")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    userId: data.user_id,
    weekNumber: data.week_number,
    weekDate: data.week_date,
    userReport: data.user_report,
    llmAnalysis: data.llm_analysis,
    adjustments: (data.adjustments as PlanAdjustment[]) ?? [],
    createdAt: data.created_at,
  };
}

export async function saveCheckin(input: SaveCheckinInput): Promise<WeeklyCheckin | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("weekly_checkins")
    .upsert(
      {
        user_id: input.userId,
        week_number: input.weekNumber,
        week_date: input.weekDate,
        user_report: input.userReport,
        llm_analysis: input.llmAnalysis,
        adjustments: input.adjustments,
      },
      { onConflict: "user_id,week_number" }
    )
    .select()
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    userId: data.user_id,
    weekNumber: data.week_number,
    weekDate: data.week_date,
    userReport: data.user_report,
    llmAnalysis: data.llm_analysis,
    adjustments: (data.adjustments as PlanAdjustment[]) ?? [],
    createdAt: data.created_at,
  };
}

export async function deleteCheckin(userId: string, id: string): Promise<boolean> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("weekly_checkins")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
  return !error;
}
