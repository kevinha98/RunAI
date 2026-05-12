/**
 * DB helpers for the athlete_profile table.
 *
 * Two-column model:
 *   llm_content  — always AI-generated (never cleared by user edits)
 *   user_content — nullable; when set, overrides llm_content in the UI
 *
 * Active content = user_content ?? llm_content
 */

import { createServiceClient } from "@/lib/supabase/service";

export interface AthleteProfile {
  userId: string;
  llmContent: string;
  userContent: string | null;
  generatedAt: string | null;
  updatedAt: string;
  /** The content that should actually be displayed / injected into prompts */
  activeContent: string;
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getAthleteProfile(userId: string): Promise<AthleteProfile | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("athlete_profile")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !data) return null;

  return {
    userId: data.user_id,
    llmContent: data.llm_content ?? "",
    userContent: data.user_content ?? null,
    generatedAt: data.generated_at ?? null,
    updatedAt: data.updated_at,
    activeContent: data.user_content ?? data.llm_content ?? "",
  };
}

// ─── Write ────────────────────────────────────────────────────────────────────

/** Save LLM-generated profile. Never touches user_content. */
export async function saveAthleteProfile(
  userId: string,
  llmContent: string
): Promise<void> {
  const supabase = createServiceClient();
  await supabase.from("athlete_profile").upsert(
    {
      user_id: userId,
      llm_content: llmContent,
      generated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
}

/** Save Hilde's manual override. Leaves llm_content untouched. */
export async function saveUserEdit(
  userId: string,
  userContent: string
): Promise<void> {
  const supabase = createServiceClient();
  await supabase.from("athlete_profile").upsert(
    { user_id: userId, user_content: userContent },
    { onConflict: "user_id" }
  );
}

/** Remove Hilde's override — reverts to llm_content. */
export async function clearUserEdit(userId: string): Promise<void> {
  const supabase = createServiceClient();
  await supabase
    .from("athlete_profile")
    .update({ user_content: null })
    .eq("user_id", userId);
}

// ─── Prompt injection ─────────────────────────────────────────────────────────

/**
 * Returns a formatted text block for injection into LLM system prompts.
 * Returns empty string if no profile exists yet.
 */
export async function buildProfileBlock(userId: string): Promise<string> {
  const profile = await getAthleteProfile(userId);
  const content = profile?.activeContent?.trim();
  if (!content) return "";

  return `## Hva vi vet om Hilde (treningsprofil)\n${content}`;
}
