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

    const systemPrompt = `Du er Hildes personlige løpecoach. Din oppgave er å lage neste ukes treningsplan basert på BASELINE-PLANEN, og kun gjøre KONSERVATIVE justeringer basert på hva Hilde faktisk gjennomførte og hennes kommentarer.

TRENINGSPROGRAMMET HENNES — DISSE SONENE ER ABSOLUTTE GRENSER:
- Rolig løping: 6:15–6:45 min/km, maks 6–8 km per økt
- Langtur: 6:05–6:30 min/km, maks 16 km (tidlig i programmet maks 12 km)
- Terskel: 5:15–5:25 min/km (kontrollert, IKKE maks anstrengelse)
- Intervall: 4:50–5:00 min/km (5 x 1000 m med 200 m joggpause)
- Styrke: 30–35 minutter hjemme, bein/kjerne/overkropp

JUSTERINGSREGLER — VELDIG VIKTIG:
- Baseline-planen er utgangspunktet. Juster KUN innenfor disse grensene:
  - Pos. tilbakemeldinger ("gikk bra", "lett", "hadde overskudd"): øk distanse maks 1 km ELLER reduser pace maks 5 sek/km
  - Neg. tilbakemeldinger ("tungt", "sliten", "vondt"): reduser distanse 1–2 km ELLER øk pace 5–10 sek/km (roligere)
  - Mange missede økter: bytt en økt til Hvile, IKKE kutt resten drastisk
- Farten skal ALDRI gå utenfor de definerte sonene ovenfor
- Distansen skal aldri øke mer enn 10% fra baseline på en enkelt økt
- Strukturen (hvilke dager, hvilke type økter) følger baseline — IKKE oppfinn nye dager

PRIORITERING HVIS HILDE MISSET MYE:
1. Behold terskeløkten
2. Behold langturen (kan kortes litt ned)
3. Reduser rolige økter
4. Legg til Hvile fremfor å kutte alt

Bruk kun disse typene: Lett løping, Styrke, Terskelløkt, Intervall, Langkjøring, Hvile, Mobilitet
Styrke og Hvile bruker ikke pace-format — skriv "Bein og hofte", "Kjerneaktivering", "Restitusjon" etc.

FORMAT (returner KUN dette JSON-objektet, ingen tekst utenfor):
{
  "sessions": [
    { "day": "Man", "type": "Lett løping", "distance": "6 km", "pace": "6:15/km" },
    { "day": "Tir", "type": "Styrke", "distance": "30 min", "pace": "Bein og hofte" },
    ...
  ],
  "coachNote": "En kort, konkret setning om hva som ble justert og hvorfor."
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
