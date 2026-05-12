/**
 * POST /api/generate-week
 *
 * Generates next week's training sessions using an LLM, based on
 * what was completed this week and any session comments.
 * Persists the result in Supabase (weekly_sessions table).
 */

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { MODELS } from "@/lib/llm";
import { createClient } from "@/lib/supabase/server";
import { getAnyStravaUserId } from "@/lib/db/user-strava";
import { saveWeekSessions, type SessionEntry } from "@/lib/db/weekly-sessions";
import { WEEKS, SESSION_ICONS, TOTAL_WEEKS } from "@/lib/plan-data";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) return user.id;
  return getAnyStravaUserId();
}

function planToSessions(weekNumber: number): SessionEntry[] {
  const weekData = WEEKS.find((w) => w.week === weekNumber) ?? WEEKS[0];
  return weekData.sessions.map((s, i) => ({
    id: `w${weekNumber}-${i}`,
    day: s.day,
    type: s.type,
    distance: s.distance,
    pace: s.pace,
    icon: SESSION_ICONS[s.type] ?? "🏃",
    completed: false,
    completedDay: null,
    comment: "",
  }));
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      currentWeek: number;
      completedSessions: SessionEntry[];
    };

    const { currentWeek, completedSessions } = body;

    if (!currentWeek || !Array.isArray(completedSessions)) {
      return NextResponse.json({ error: "Missing currentWeek or completedSessions" }, { status: 400 });
    }

    const nextWeek = currentWeek + 1;
    if (nextWeek > TOTAL_WEEKS) {
      return NextResponse.json({ error: "No more weeks in plan" }, { status: 400 });
    }

    const userId = await resolveUserId();

    // Build the baseline plan for next week
    const nextWeekData = WEEKS.find((w) => w.week === nextWeek) ?? WEEKS[nextWeek - 1];
    const baselineSessions = planToSessions(nextWeek);

    // Summarize this week
    const done = completedSessions.filter((s) => s.completed);
    const notDone = completedSessions.filter((s) => !s.completed);

    const completedLines = done.length === 0
      ? "Ingen økter gjennomført denne uken."
      : done.map((s) => {
          const dayDone = s.completedDay ?? s.day;
          const comment = s.comment?.trim() ? ` — Kommentar: "${s.comment.trim()}"` : "";
          return `✓ ${dayDone}: ${s.type} ${s.distance} (planlagt ${s.day})${comment}`;
        }).join("\n");

    const missedLines = notDone.length === 0
      ? ""
      : "\nIKKE gjennomført:\n" + notDone.map((s) => `✗ ${s.day}: ${s.type} ${s.distance}`).join("\n");

    const baselineLines = baselineSessions
      .map((s) => `${s.day}: ${s.type} ${s.distance} @ ${s.pace}`)
      .join("\n");

    const systemPrompt = `Du er Hildes personlige løpecoach. Din oppgave er å justere neste ukes treningsplan basert på hva Hilde faktisk gjennomførte denne uken og hennes kommentarer.

REGLER:
- Returner ALLTID gyldig JSON — ingenting annet
- Returner en liste med 7 treningsøkter (en per dag Man–Søn)
- Behold samme dager og struktur som baseline, men juster type/distanse/pace basert på gjennomføring
- Hvis Hilde ikke fullførte mye, reduser litt og legg inn mer hvile
- Hvis hun hadde gode kommentarer og gjennomførte alt, kan du legge til litt mer
- Pace skal alltid være realistisk og angis som MM:SS/km eller "Kjerneaktivering" etc for styrke
- Bruk kun disse typene: Lett løping, Styrke, Terskelløkt, Intervall, Langkjøring, Hvile, Mobilitet

FORMAT (returner kun dette JSON-objektet):
{
  "sessions": [
    { "day": "Man", "type": "Lett løping", "distance": "7 km", "pace": "5:55/km" },
    { "day": "Tir", "type": "Styrke", "distance": "40 min", "pace": "Kjerneaktivering" },
    ...
  ],
  "coachNote": "En kort setning til Hilde om justeringene og hva hun bør fokusere på."
}`;

    const userMessage = `GJELDENDE UKE: ${currentWeek}
NESTE UKE: ${nextWeek} — Fase: ${nextWeekData.phase} — Planlagt totalt: ${nextWeekData.totalKm} km

GJENNOMFØRT DENNE UKEN:
${completedLines}${missedLines}

BASELINE FOR NESTE UKE (start fra dette, juster etter behov):
${baselineLines}

Generer neste ukes justerte plan nå.`;

    const client = getClient();
    const msg = await client.messages.create({
      model: MODELS.SONNET,
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const raw = msg.content[0].type === "text" ? msg.content[0].text : "";

    // Parse JSON response
    let parsed: { sessions: Array<{ day: string; type: string; distance: string; pace: string }>; coachNote: string };
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch?.[0] ?? raw);
    } catch {
      return NextResponse.json({ error: "LLM returned invalid JSON", raw }, { status: 500 });
    }

    // Map to SessionEntry[]
    const newSessions: SessionEntry[] = parsed.sessions.map((s, i) => ({
      id: `w${nextWeek}-llm-${i}`,
      day: s.day,
      type: s.type,
      distance: s.distance,
      pace: s.pace,
      icon: SESSION_ICONS[s.type] ?? "🏃",
      completed: false,
      completedDay: null,
      comment: "",
    }));

    // Persist to Supabase
    if (userId) {
      await saveWeekSessions(userId, nextWeek, newSessions, "llm");
    }

    return NextResponse.json({
      weekNumber: nextWeek,
      sessions: newSessions,
      coachNote: parsed.coachNote ?? "",
      source: "llm",
    });
  } catch (err) {
    console.error("[api/generate-week] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
