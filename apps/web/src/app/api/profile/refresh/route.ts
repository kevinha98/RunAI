/**
 * POST /api/profile/refresh
 *
 * Generates (or regenerates) the athlete profile narrative using LLM.
 * Input: all checkins + Strava stats + optional fiveKSeconds
 * Saves to athlete_profile.llm_content (never touches user_content).
 *
 * Also exported as refreshAthleteProfile(userId, fiveKSeconds?) for
 * fire-and-forget use from other API routes (sync, checkin).
 */

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { MODELS } from "@/lib/llm";
import { readUserStats } from "@/lib/stats-store";
import { formatPace } from "@/lib/strava-types";
import { createClient } from "@/lib/supabase/server";
import { getAnyStravaUserId } from "@/lib/db/user-strava";
import { getUserCheckins } from "@/lib/db/checkins";
import { saveAthleteProfile } from "@/lib/db/athlete-profile";
import { getCurrentWeek, TOTAL_WEEKS } from "@/lib/plan-data";

export const maxDuration = 60;
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

// ─── Core logic (reusable) ───────────────────────────────────────────────────

export async function refreshAthleteProfile(
  userId: string,
  fiveKSeconds?: number
): Promise<void> {
  const [stats, checkins] = await Promise.all([
    readUserStats(userId),
    getUserCheckins(userId, 100),
  ]);

  const today = new Date();
  const todayFormatted = today.toLocaleDateString("nb-NO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const currentWeek = getCurrentWeek();

  // Build Strava summary
  const totalKm = (stats.stravaStats?.all_run_totals?.distance ?? 0) / 1000;
  const ytdKm = (stats.stravaStats?.ytd_run_totals?.distance ?? 0) / 1000;
  const recentRuns = (stats.recentActivities ?? [])
    .filter((a) => a.type === "Run")
    .slice(0, 10)
    .map((a) => {
      const km = (a.distance / 1000).toFixed(1);
      const pace = formatPace(a.moving_time / (a.distance / 1000));
      const date = new Date(a.start_date_local).toLocaleDateString("nb-NO", {
        day: "numeric",
        month: "short",
      });
      const hr = a.average_heartrate ? ` | puls ${Math.round(a.average_heartrate)}` : "";
      return `• ${date}: ${km} km @ ${pace}/km${hr}`;
    })
    .join("\n");

  const stravaBlock =
    recentRuns
      ? `Siste 10 løpeturer:\n${recentRuns}\n\nTotal km noensinne: ${totalKm.toFixed(0)} km | År til dato: ${ytdKm.toFixed(0)} km`
      : "Ingen Strava-data.";

  // Build P5k block
  const p5kBlock =
    fiveKSeconds && fiveKSeconds > 0
      ? (() => {
          const p5k = fiveKSeconds / 5;
          const fmt = (s: number) => {
            const m = Math.floor(s / 60);
            const sec = Math.round(s % 60);
            return `${m}:${String(sec).padStart(2, "0")}/km`;
          };
          return `5K-tid: ${Math.floor(fiveKSeconds / 60)}:${String(Math.round(fiveKSeconds % 60)).padStart(2, "0")}
Treningstempo (P5k = ${fmt(p5k)}):
  Rolig jogg: ${fmt(p5k + 75)}
  Langtur: ${fmt(p5k + 90)}
  Terskel: ${fmt(p5k + 20)}
  Intervall: ${fmt(p5k - 12)}`;
        })()
      : "Ingen 5K-tid registrert.";

  // Build checkin history block
  const checkinBlock =
    checkins.length === 0
      ? "Ingen ukerapporter ennå."
      : checkins
          .slice()
          .reverse() // oldest first
          .map((c) => {
            const adj = c.adjustments?.length
              ? `\nJusteringer foreslått: ${c.adjustments.length}`
              : "";
            return `--- Uke ${c.weekNumber} (${c.weekDate}) ---\nHildes rapport: ${c.userReport.slice(0, 300)}${c.userReport.length > 300 ? "…" : ""}\nTreners analyse: ${c.llmAnalysis.slice(0, 400)}${c.llmAnalysis.length > 400 ? "…" : ""}${adj}`;
          })
          .join("\n\n");

  const systemPrompt = `Du er en ekspert løpetrenervurdering-AI. Du mottar all data vi har om løperen Hilde, og skriver en sammenhengende, ærlig treningsprofil-narrativ på norsk.

DAGENS DATO: ${todayFormatted}
GJELDENDE PLANUKE: ${currentWeek}/${TOTAL_WEEKS}

Skriv profilen som en løpende, sammenhengende tekst (IKKE som en liste med overskrifter).
Dekk disse temaene naturlig i teksten:
- Hildes nåværende form og prestasjonsnivå
- Styrker du observerer fra treningsdataen
- Svakheter eller mønstre som hemmer fremgangen
- Trender over tid (bedring, stagnasjon, belastningsmønster)
- Anbefalt belastningsnivå og neste fokusområder
- Eventuelle advarsler (overtrening, skade-tegn, for lite variasjon)

Vær ærlig og direkte. Dette er "the hard truth" — ikke smiger, men faktabasert.
Bruk data fra ukerapportene og Strava aktivt. Unngå vage generaliseringer.
Lengde: 3–5 avsnitt.`;

  const userMessage = `Her er all data vi har om Hilde:

## Strava-data
${stravaBlock}

## Treningstempo (P5k-basert)
${p5kBlock}

## Ukerapporter og treneranalyser (${checkins.length} stk, kronologisk)
${checkinBlock}

Skriv en ærlig, sammenhengende treningsprofil-narrativ basert på disse dataene.`;

  const client = getClient();
  const response = await client.messages.create({
    model: MODELS.SONNET,
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const content = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("")
    .trim();

  await saveAthleteProfile(userId, content);
}

// ─── Route handler ────────────────────────────────────────────────────────────

async function resolveUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return user.id;
  return getAnyStravaUserId();
}

export async function POST(req: NextRequest) {
  try {
    const userId = await resolveUserId();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const fiveKSeconds: number | undefined =
      typeof body.fiveKSeconds === "number" && body.fiveKSeconds > 0
        ? body.fiveKSeconds
        : undefined;

    await refreshAthleteProfile(userId, fiveKSeconds);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/profile/refresh POST]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
