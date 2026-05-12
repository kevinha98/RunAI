/**
 * DB helpers for:
 *   coach_memory       — individual facts extracted/added about Hilde
 *   coach_conversation — persistent chat history (last 30 messages)
 *
 * Memory extraction uses MODELS.HAIKU (cheap/fast) to find new facts in
 * each user message. Called fire-and-forget from /api/coach/history POST.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { MODELS } from "@/lib/llm";
import Anthropic from "@anthropic-ai/sdk";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CoachMemory {
  id: string;
  memory: string;
  category: string;
  source: "auto" | "manual";
  createdAt: string;
}

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

// ─── Memory CRUD ──────────────────────────────────────────────────────────────

export async function getCoachMemories(userId: string): Promise<CoachMemory[]> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("coach_memory")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  return (data ?? []).map((r) => ({
    id: r.id,
    memory: r.memory,
    category: r.category,
    source: r.source as "auto" | "manual",
    createdAt: r.created_at,
  }));
}

export async function addCoachMemory(
  userId: string,
  memory: string,
  category: string,
  source: "auto" | "manual" = "auto"
): Promise<void> {
  const supabase = createServiceClient();
  await supabase
    .from("coach_memory")
    .insert({ user_id: userId, memory, category, source });
}

export async function deleteCoachMemory(userId: string, id: string): Promise<void> {
  const supabase = createServiceClient();
  await supabase
    .from("coach_memory")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
}

export async function clearAllCoachMemories(userId: string): Promise<void> {
  const supabase = createServiceClient();
  await supabase.from("coach_memory").delete().eq("user_id", userId);
}

// ─── Memory → prompt block ────────────────────────────────────────────────────

/**
 * Returns a formatted block for injection into LLM system prompts.
 * Groups memories by category. Returns empty string if no memories.
 */
export async function buildMemoryBlock(userId: string): Promise<string> {
  const memories = await getCoachMemories(userId);
  if (memories.length === 0) return "";

  const grouped: Record<string, string[]> = {};
  for (const m of memories) {
    const key = m.category ?? "generell";
    (grouped[key] ??= []).push(m.memory);
  }

  const lines = Object.entries(grouped)
    .map(
      ([cat, mems]) =>
        `${cat.charAt(0).toUpperCase() + cat.slice(1)}:\n${mems.map((m) => `  - ${m}`).join("\n")}`
    )
    .join("\n");

  return `## Hukommelse — fakta vi vet om Hilde\n${lines}`;
}

// ─── Memory extraction (Haiku — cheap + fast) ─────────────────────────────────

/**
 * Given a user message, extract new facts worth remembering and save them.
 * Runs fire-and-forget. Never throws — safe to call without await.
 */
export async function extractAndSaveMemories(
  userId: string,
  userMessage: string
): Promise<void> {
  const apiKey = process.env.RADICAL_GATEWAY_TOKEN ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return;

  try {
    const existing = await getCoachMemories(userId);
    const existingList =
      existing.length > 0
        ? existing.map((m) => `- ${m.memory}`).join("\n")
        : "(ingen minner ennå)";

    const client = new Anthropic({
      baseURL: "https://gateway.raicode.no",
      apiKey,
      defaultHeaders: { "x-api-key": apiKey },
    });

    const response = await client.messages.create({
      model: MODELS.HAIKU,
      max_tokens: 300,
      system: `Du er et minneekstraksjonssystem for en løpecoach-app. Les brukerens melding og ekstraher BARE nye, konkrete fakta om brukeren som er verdt å huske på tvers av samtaler.

Eksisterende minner (ikke dupliser disse):
${existingList}

Returner en JSON-array med 0–3 fakta (tom array hvis ingenting nytt):
[{"memory": "...", "category": "helse|mål|preferanse|observasjon|generell"}]

Kategorier:
- helse: skader, smerter, sykdom, restitusjonsbehov
- mål: tidsmål, distansemål, løp de skal delta i
- preferanse: treningsønsker, tidspunkt, utstyr, ernæring
- observasjon: livshendelser, ferie, jobb, familie som påvirker trening
- generell: alt annet konkret og permanent

IKKE husk: vage kommentarer, spørsmål, ros/kritikk av appen, ting som ikke handler om brukeren personlig.`,
      messages: [{ role: "user", content: userMessage }],
    });

    const raw = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("")
      .trim();

    const cleaned = raw.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();
    const facts = JSON.parse(cleaned) as Array<{ memory: string; category: string }>;

    for (const f of facts) {
      if (f.memory?.trim()) {
        await addCoachMemory(userId, f.memory.trim(), f.category ?? "generell", "auto");
      }
    }
  } catch {
    // Extraction failed silently — never block the main flow
  }
}

// ─── Conversation persistence ─────────────────────────────────────────────────

const MAX_SAVED_MESSAGES = 30;

export async function getCoachConversation(
  userId: string
): Promise<ConversationMessage[]> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("coach_conversation")
    .select("messages")
    .eq("user_id", userId)
    .single();

  return (data?.messages as ConversationMessage[]) ?? [];
}

export async function saveCoachConversation(
  userId: string,
  messages: ConversationMessage[]
): Promise<void> {
  const supabase = createServiceClient();
  const trimmed = messages.slice(-MAX_SAVED_MESSAGES);
  await supabase
    .from("coach_conversation")
    .upsert({ user_id: userId, messages: trimmed }, { onConflict: "user_id" });
}

export async function clearCoachConversation(userId: string): Promise<void> {
  const supabase = createServiceClient();
  await supabase
    .from("coach_conversation")
    .delete()
    .eq("user_id", userId);
}
