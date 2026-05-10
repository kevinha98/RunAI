"use server";

import { createClient } from "@/lib/supabase/server";
import type { Session, Week } from "@/lib/plan-data";
import { WEEKS, SESSION_ICONS } from "@/lib/plan-data";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SessionOverrideKey = string; // e.g. "1-Man"

export interface SessionOverride {
  type?: string;
  distance?: string;
  pace?: string;
  icon?: string;
}

export type OverridesMap = Record<SessionOverrideKey, SessionOverride>;

// ─── Read overrides ───────────────────────────────────────────────────────────

export async function loadSessionOverrides(userId: string): Promise<OverridesMap> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("user_strava")
    .select("custom_plan_overrides")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[loadSessionOverrides] Supabase error:", error.message);
    return {};
  }

  const raw = data?.custom_plan_overrides;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};

  return raw as OverridesMap;
}

// ─── Write / update one session override ─────────────────────────────────────

export async function updateSessionOverride(
  userId: string,
  week: number,
  day: string,
  patch: SessionOverride
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const current = await loadSessionOverrides(userId);

  const key: SessionOverrideKey = `${week}-${day}`;
  const updated: OverridesMap = {
    ...current,
    [key]: {
      ...current[key],
      ...patch,
    },
  };

  const { error } = await supabase
    .from("user_strava")
    .upsert(
      { user_id: userId, custom_plan_overrides: updated },
      { onConflict: "user_id" }
    );

  if (error) {
    console.error("[updateSessionOverride] Supabase error:", error.message);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ─── Delete one override (revert to original) ─────────────────────────────────

export async function deleteSessionOverride(
  userId: string,
  week: number,
  day: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const current = await loadSessionOverrides(userId);
  const key: SessionOverrideKey = `${week}-${day}`;

  if (!current[key]) return { success: true };

  const { [key]: _removed, ...rest } = current;
  const updated: OverridesMap = rest as OverridesMap;

  const { error } = await supabase
    .from("user_strava")
    .upsert(
      { user_id: userId, custom_plan_overrides: updated },
      { onConflict: "user_id" }
    );

  if (error) {
    console.error("[deleteSessionOverride] Supabase error:", error.message);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ─── Merge base plan with overrides ──────────────────────────────────────────

export async function applyOverrides(weeks: Week[], overrides: OverridesMap): Promise<Week[]> {
  return weeks.map((week) => ({
    ...week,
    sessions: week.sessions.map((session) => {
      const key: SessionOverrideKey = `${week.week}-${session.day}`;
      const override = overrides[key];
      if (!override) return session;
      const newType = override.type ?? session.type;
      return {
        ...session,
        type: newType,
        distance: override.distance ?? session.distance,
        pace: override.pace ?? session.pace,
        icon: override.icon ?? SESSION_ICONS[newType] ?? session.icon,
      };
    }),
  }));
}
