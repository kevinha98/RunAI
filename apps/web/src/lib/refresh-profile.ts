/**
 * Shared helper for refreshing the athlete profile narrative.
 * Extracted to a lib file so it can be imported from multiple routes
 * without pulling in Next.js route segment configs (maxDuration, dynamic).
 *
 * Used by:
 *  - /api/checkin    (fire-and-forget after new weekly report)
 *  - /api/strava/sync (fire-and-forget after Strava data refresh)
 *  - /api/profile/refresh (the actual route — re-exports from here)
 */

import Anthropic from "@anthropic-ai/sdk";
import { MODELS } from "@/lib/llm";
import { readUserStats } from "@/lib/stats-store";
import { formatPace } from "@/lib/strava-types";
import { getUserCheckins } from "@/lib/db/checkins";
import { saveAthleteProfile } from "@/lib/db/athlete-profile";
import { getCurrentWeek, TOTAL_WEEKS } from "@/lib/plan-data";

function getClient(): Anthropic {
  const apiKey = process.env.RADICAL_GATEWAY_TOKEN ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing LLM credentials");
  return new Anthropic({
    baseURL: "https://gateway.raicode.no",
    apiKey,
    defaultHeaders: { "x-api-key": apiKey },
  });
}

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

  const stravaBlock = recentRuns
    ? `Siste 10 løpeturer:\n${recentRuns}\n\nTotal km noensinne: ${totalKm.toFixed(0)} km | År til dato: ${ytdKm.toFixed(0)} km`
    : "Ingen Strava-data.";

  // Build P5k block
  const p5kBlock =
    fiveKSeconds && fiveKSeconds > 0
      ? (() => {
          const p5k = fiveKSeconds; // already sec/km
          const fmt = (s: number) => {
            const m = Math.floor(s / 60);
            const sec = Math.round(s % 60);
            return `${m}:${String(sec).padStart(2, "0")}/km`;
          };
          return `P5k-fart: ${Math.floor(fiveKSeconds / 60)}:${String(Math.round(fiveKSeconds % 60)).padStart(2, "0")}/km
Treningstempo (P5k = ${fmt(p5k)}):
  Rolig jogg: ${fmt(p5k + 90)}
  Langtur: ${fmt(p5k + 75)}
  Terskel: ${fmt(p5k + 20)}
  Intervall: ${fmt(p5k - 10)}`;
        })()
      : "Ingen P5k-fart registrert.";

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
