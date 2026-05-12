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
      fiveKSeconds?: number;
    };

    const { currentWeek, completedSessions, fiveKSeconds } = body;

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

    // Beregn P5k-soner — dette er den eneste pacekilden for genererte planer
    const fmt = (s: number) => {
      const m = Math.floor(s / 60), sec = Math.round(s % 60);
      return `${m}:${String(sec).padStart(2, "0")}/km`;
    };

    let zonesBlock = "";
    if (fiveKSeconds && fiveKSeconds > 0) {
      const p5k = fiveKSeconds / 5;
      zonesBlock = `HILDES PERSONLIGE TRENINGSSONER — DISSE ER DE ENESTE GYLDIGE PACE-VERDIENE DU KAN BRUKE:
- Lett løping: ${fmt(p5k + 75)} (P5k + 75 sek/km) — kun ±5 sek justering tillatt
- Langkjøring: ${fmt(p5k + 90)} (P5k + 90 sek/km) — kun ±5 sek justering tillatt
- Terskelløkt: ${fmt(p5k + 20)} (P5k + 20 sek/km) — kun ±5 sek justering tillatt
- Intervall: ${fmt(p5k - 12)} (P5k − 12 sek/km) — kun ±3 sek justering tillatt

MERK: Ignorer alle pace-verdier fra baseline-planen nedenfor — de er generiske og ikke tilpasset Hilde.
Du MÅ bruke sonene ovenfor som startpunkt, og kun justere basert på tilbakemeldingene.`;
    } else {
      zonesBlock = `GENERELLE TRENINGSSONER (brukes kun om ingen 5K-tid er registrert):
- Lett løping: 6:20/km
- Langkjøring: 6:30/km
- Terskelløkt: 5:25/km
- Intervall: 5:05/km`;
    }

    const systemPrompt = `Du er Hildes personlige løpecoach med lang erfaring innen utholdenhetstrening for mosjonister. Du skal lage neste ukes plan basert på hva hun faktisk gjennomførte og hva hun rapporterte.
${zonesBlock}
GYLNE JUSTERINGSREGLER — bruk disse per økttype:

Rolig jogg (mål: restitusjon, RPE 3–4):
  - Lett (lavere RPE enn ventet): +1–2 km neste gang
  - Riktig (RPE som forventet): behold, evt. små justeringer
  - Hard (høyere RPE enn ventet): senk fart / kort ned distansen
  - Trend over tid: juster fart gradvis

Langtur (mål: aerob kapasitet, RPE 3–5):
  - Lett: +1–2 km neste gang
  - Riktig: behold, evt. små justeringer
  - Hard: −20% lengde + litt roligere tempo
  - Trend over tid: juster fart gradvis

Terskelløkt (mål: øke fart, RPE 6–7):
  - Lett: øk volum (flere drag / lenger drag) → deretter øk fart
  - Riktig: behold, evt. små justeringer
  - Hard: senk fart eller reduser volum
  - Trend over tid: juster fart gradvis

Intervall 1000m (mål: VO2 maks, RPE 8–9):
  - Lett: +1 drag ELLER −5 sek/km
  - Riktig: behold, evt. små justeringer
  - Hard: færre drag / mer pause / roligere
  - Trend over tid: juster fart gradvis

Generelle regler:
- Øk aldri langtur og terskel/intervall samme uke
- 80% av ukens km skal være rolig løping
- Missede økter: behold terskel og langtur, reduser rolig, legg til Hvile fremfor å kutte alt
- Strukturen (hvilke dager, hvilke økttyper) følger baseline — ikke oppfinn nye dager
- Les øktkommentarene nøye — de er den viktigste kilden til RPE-vurderingen

Bruk kun disse typene: Lett løping, Styrke, Terskelløkt, Intervall, Langkjøring, Hvile, Mobilitet
Styrke og Hvile bruker ikke pace — skriv f.eks. "Bein og hofte" eller "Restitusjon".

FORMAT (returner KUN dette JSON-objektet, ingen tekst utenfor):
{
  "sessions": [
    { "day": "Man", "type": "Lett løping", "distance": "6 km", "pace": "6:20/km" },
    { "day": "Tir", "type": "Styrke", "distance": "30 min", "pace": "Bein og hofte" },
    ...
  ],
  "coachNote": "Én konkret setning om hva du justerte og hvorfor — referér gjerne til det hun rapporterte."
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
