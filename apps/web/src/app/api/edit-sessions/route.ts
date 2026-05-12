/**
 * POST /api/edit-sessions
 *
 * Chat-based session editing. The user sends a natural-language message
 * (e.g. "gjør tirsdagens økt kortere") along with the current sessions
 * and the LLM returns adjusted sessions + an explanation.
 *
 * Conversation history is passed in/out so the client can maintain context
 * across turns.
 */

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { MODELS } from "@/lib/llm";
import { createClient } from "@/lib/supabase/server";
import { getAnyStravaUserId } from "@/lib/db/user-strava";
import { buildProfileBlock } from "@/lib/db/athlete-profile";
import { getUserCheckins } from "@/lib/db/checkins";
import { readUserStats } from "@/lib/stats-store";
import { formatPace } from "@/lib/strava-types";
import { buildMemoryBlock } from "@/lib/db/coach-memory";
import type { SessionEntry } from "@/lib/db/weekly-sessions";

export const maxDuration = 45;
export const dynamic = "force-dynamic";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function getClient(): Anthropic {
  const apiKey = process.env.RADICAL_GATEWAY_TOKEN ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing LLM credentials");
  return new Anthropic({
    baseURL: "https://gateway.raicode.no",
    apiKey,
    defaultHeaders: { "x-api-key": apiKey },
  });
}

async function resolveUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return user.id;
  return getAnyStravaUserId();
}

const VALID_TYPES = [
  "Lett løping", "Styrke", "Terskelløkt", "Intervall",
  "Langkjøring", "Hvile", "Mobilitet", "Rolig jogg",
];

export async function POST(req: NextRequest) {
  try {
    const userId = await resolveUserId();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body = await req.json();
    const {
      message,
      sessions,
      weekNumber,
      history = [],
      fiveKSeconds,
    }: {
      message: string;
      sessions: SessionEntry[];
      weekNumber: number;
      history?: ChatMessage[];
      fiveKSeconds?: number;
    } = body;

    if (!message?.trim() || !Array.isArray(sessions)) {
      return NextResponse.json({ error: "Missing message or sessions" }, { status: 400 });
    }

    const [profileBlock, stats, checkins, memoryBlock] = await Promise.all([
      buildProfileBlock(userId),
      readUserStats(userId),
      getUserCheckins(userId, 5),
      buildMemoryBlock(userId),
    ]);

    // Build recent Strava runs block
    const recentRuns = (stats.recentActivities ?? [])
      .filter((a) => a.type === "Run")
      .slice(0, 7)
      .map((a) => {
        const km = (a.distance / 1000).toFixed(1);
        const pace = formatPace(a.moving_time / (a.distance / 1000));
        const date = new Date(a.start_date_local).toLocaleDateString("nb-NO", { day: "numeric", month: "short" });
        const hr = a.average_heartrate ? ` | puls ${Math.round(a.average_heartrate)}` : "";
        return `• ${date}: ${km} km @ ${pace}/km${hr}`;
      })
      .join("\n");
    const stravaBlock = recentRuns ? `\nSiste løpeturer (Strava):\n${recentRuns}` : "";

    // Build recent checkin history block
    const checkinBlock =
      checkins.length === 0
        ? ""
        : `\nTidligere ukerapporter (siste ${checkins.length}):${
            checkins
              .slice()
              .reverse()
              .map((c) => `\nUke ${c.weekNumber}: ${c.userReport.slice(0, 120)}${c.userReport.length > 120 ? "…" : ""}`)
              .join("")
          }`;

    // Format current sessions for LLM
    const sessionsText = sessions
      .map((s) => `${s.day}: ${s.type} — ${s.distance} @ ${s.pace}${s.completed ? " ✓" : ""}${s.comment ? ` (kommentar: "${s.comment}")` : ""}`)
      .join("\n");

    // P5k pace context
    const p5kBlock =
      fiveKSeconds && fiveKSeconds > 0
        ? (() => {
            const p5k = fiveKSeconds / 5;
            const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}/km`;
            return `\nP5k-baserte målfartsoner:\n  Rolig: ${fmt(p5k + 90)} | Langtur: ${fmt(p5k + 75)} | Terskel: ${fmt(p5k + 20)} | Intervall: ${fmt(p5k - 10)}`;
          })()
        : "";

    const systemPrompt = `Du er Hildes personlige løpecoach. Du hjelper henne med å justere ukeøktene via chat.
${memoryBlock ? "\n" + memoryBlock + "\n" : ""}${profileBlock ? "\n" + profileBlock + "\n" : ""}${stravaBlock}${checkinBlock}

GJELDENDE UKEPLAN — Uke ${weekNumber}:
${sessionsText}
${p5kBlock}

Gyldige økttyper: ${VALID_TYPES.join(" | ")}

Regler:
- Svar ALLTID på norsk, vennlig og konkret
- Forklar hva du endrer og HVORFOR, én setning
- Returner ALLTID hele ukeplanens sessioner (inkl. uendrede) i JSON-format
- Bruk eksisterende dag-rekkefølge — ikke oppfinn nye dager
- Distanse = "X km" eller "X min". Fart = "M:SS/km" eller beskrivelse for Styrke/Hvile
- Respekter P5k-fartsoner hvis oppgitt

Svar i dette eksakte JSON-formatet (ingen tekst utenfor):
{
  "explanation": "Én setning som forklarer endringen",
  "sessions": [
    { "id": "...", "day": "Man", "type": "Lett løping", "distance": "6 km", "pace": "6:20/km", "icon": "🏃", "completed": false, "completedDay": null, "comment": "" }
  ]
}`;

    // Build message history (max 10 turns)
    const historyMessages: Anthropic.MessageParam[] = history
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content }));

    const userMessage = message.trim();

    const client = getClient();
    const response = await client.messages.create({
      model: MODELS.SONNET,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [...historyMessages, { role: "user", content: userMessage }],
    });

    const raw = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("")
      .trim();

    // Parse JSON response
    let parsed: { explanation: string; sessions: SessionEntry[] };
    try {
      // Strip markdown code fences if present
      const cleaned = raw.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: "LLM returnerte ugyldig format. Prøv igjen." }, { status: 502 });
    }

    // Validate sessions
    const validatedSessions: SessionEntry[] = (parsed.sessions ?? sessions).map((s: SessionEntry) => ({
      id: s.id ?? `w${weekNumber}-${s.day}`,
      day: s.day,
      type: VALID_TYPES.includes(s.type) ? s.type : "Lett løping",
      distance: s.distance ?? "",
      pace: s.pace ?? "",
      icon: s.icon ?? "🏃",
      completed: s.completed ?? false,
      completedDay: s.completedDay ?? null,
      comment: s.comment ?? "",
    }));

    // Build updated conversation history
    const updatedHistory: ChatMessage[] = [
      ...history.slice(-10),
      { role: "user", content: userMessage },
      { role: "assistant", content: raw },
    ];

    return NextResponse.json({
      explanation: parsed.explanation ?? "Uken er oppdatert.",
      sessions: validatedSessions,
      history: updatedHistory,
    });
  } catch (err) {
    console.error("[api/edit-sessions POST]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
