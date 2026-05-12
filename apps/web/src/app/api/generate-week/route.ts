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

    // ── Pace-beregning (P5k-basert) ──────────────────────────────────────────
    const fmt = (s: number) => {
      const m = Math.floor(s / 60), sec = Math.round(s % 60);
      return `${m}:${String(sec).padStart(2, "0")}/km`;
    };

    /** Parse "M:SS/km" → seconds/km, returns null if unparseable */
    const parsePace = (pace: string): number | null => {
      const m = pace.match(/^(\d+):(\d{2})/);
      if (!m) return null;
      return parseInt(m[1]) * 60 + parseInt(m[2]);
    };

    // P5k target paces (seconds/km)
    type ZoneKey = "Lett løping" | "Langkjøring" | "Terskelløkt" | "Intervall";
    const p5kTargets: Record<ZoneKey, number> | null = (fiveKSeconds && fiveKSeconds > 0)
      ? (() => {
          const p5k = fiveKSeconds / 5;
          return {
            "Lett løping":  p5k + 75,
            "Langkjøring":  p5k + 90,
            "Terskelløkt":  p5k + 20,
            "Intervall":    p5k - 12,
          };
        })()
      : null;

    // Max allowed drift from the P5k target (seconds)
    const MAX_DRIFT: Record<ZoneKey, number> = {
      "Lett løping": 10,
      "Langkjøring": 10,
      "Terskelløkt": 8,
      "Intervall":   5,
    };

    let zonesBlock = "";
    if (p5kTargets) {
      zonesBlock = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REGEL 1 — PACE: Du SKAL bruke disse fartene. Ingen unntak.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Lett løping → ${fmt(p5kTargets["Lett løping"])}  (tillatt: ${fmt(p5kTargets["Lett løping"] - MAX_DRIFT["Lett løping"])}–${fmt(p5kTargets["Lett løping"] + MAX_DRIFT["Lett løping"])})
  Langkjøring → ${fmt(p5kTargets["Langkjøring"])}  (tillatt: ${fmt(p5kTargets["Langkjøring"] - MAX_DRIFT["Langkjøring"])}–${fmt(p5kTargets["Langkjøring"] + MAX_DRIFT["Langkjøring"])})
  Terskelløkt → ${fmt(p5kTargets["Terskelløkt"])}  (tillatt: ${fmt(p5kTargets["Terskelløkt"] - MAX_DRIFT["Terskelløkt"])}–${fmt(p5kTargets["Terskelløkt"] + MAX_DRIFT["Terskelløkt"])})
  Intervall   → ${fmt(p5kTargets["Intervall"])}  (tillatt: ${fmt(p5kTargets["Intervall"] - MAX_DRIFT["Intervall"])}–${fmt(p5kTargets["Intervall"] + MAX_DRIFT["Intervall"])})

FORBUDT: bruk ALDRI pace fra baseline-planen — de er generiske og feil for Hilde.
FORBUDT: skriv ALDRI en pace utenfor tillatt-intervallet ovenfor.
Styrke og Hvile har IKKE pace — skriv beskrivelse ("Bein og hofte", "Restitusjon").
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    } else {
      zonesBlock = `GENERELLE TRENINGSSONER (brukes kun om ingen 5K-tid er registrert):
  Lett løping → 6:20/km  |  Langkjøring → 6:30/km
  Terskelløkt → 5:25/km  |  Intervall → 5:05/km`;
    }

    const systemPrompt = `Du er Hildes personlige løpecoach. Lag neste ukes plan basert på hva hun gjennomførte og rapporterte.

${zonesBlock}

REGEL 2 — JUSTERINGSREGLER per økttype:

Rolig jogg (mål: restitusjon, RPE 3–4):
  - Lett (lavere RPE enn ventet): +1–2 km neste gang
  - Riktig (RPE som forventet): behold, evt. små justeringer
  - Hard (høyere RPE enn ventet): senk fart / kort ned distansen
  - Trend over tid: juster fart gradvis

Langtur (mål: aerob kapasitet, RPE 3–5):
  - Lett: +1–2 km neste gang
  - Riktig: behold, evt. små justeringer
  - Hard: −20% lengde + roligere tempo
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

REGEL 3 — STRUKTUR:
- Øk aldri langtur og terskel/intervall samme uke
- 80% av ukens km skal være rolig løping
- Strukturen (dager + økttyper) følger baseline — ikke oppfinn nye dager
- Missede økter: behold terskel og langtur; legg til Hvile fremfor å kutte alt
- Les kommentarene nøye — de er den viktigste RPE-kilden

REGEL 4 — GYLDIGE TYPER:
Lett løping | Styrke | Terskelløkt | Intervall | Langkjøring | Hvile | Mobilitet

REGEL 5 — FORMAT (returner KUN dette JSON-objektet, null tekst utenfor):
{
  "sessions": [
    { "day": "Man", "type": "Lett løping", "distance": "6 km", "pace": "6:20/km" },
    { "day": "Tir", "type": "Styrke", "distance": "30 min", "pace": "Bein og hofte" }
  ],
  "coachNote": "Én setning: hva ble justert og hvorfor, referér til det hun rapporterte."
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

    // Map to SessionEntry[] — enforce P5k paces server-side as hard guardrail
    const newSessions: SessionEntry[] = parsed.sessions.map((s, i) => {
      let pace = s.pace;

      // Clamp running session paces to the allowed P5k range
      if (p5kTargets && s.type in p5kTargets) {
        const type = s.type as ZoneKey;
        const target = p5kTargets[type];
        const maxDrift = MAX_DRIFT[type];
        const parsed_pace = parsePace(pace);
        if (parsed_pace !== null) {
          // Clamp: if LLM strayed too far, pull back to target
          const clamped = Math.min(Math.max(parsed_pace, target - maxDrift), target + maxDrift);
          pace = fmt(clamped);
        } else {
          // Unparseable → use target directly
          pace = fmt(target);
        }
      }

      return {
        id: `w${nextWeek}-llm-${i}`,
        day: s.day,
        type: s.type,
        distance: s.distance,
        pace,
        icon: SESSION_ICONS[s.type] ?? "🏃",
        completed: false,
        completedDay: null,
        comment: "",
      };
    });

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
