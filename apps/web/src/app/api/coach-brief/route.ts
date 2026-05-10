/**
 * GET /api/coach-brief
 *
 * Returns a short LLM-generated coach status message for the dashboard top card.
 * Max 3 paragraphs — what was done last week, how Hilde felt, and next week plan.
 */

import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { MODELS } from "@/lib/llm";
import { readUserStats } from "@/lib/stats-store";
import { formatPace } from "@/lib/strava-types";
import { createClient } from "@/lib/supabase/server";
import { getAnyStravaUserId } from "@/lib/db/user-strava";
import { getUserCheckins } from "@/lib/db/checkins";
import { WEEKS, getCurrentWeek } from "@/lib/plan-data";

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
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return user.id;
  return getAnyStravaUserId();
}

export async function GET() {
  try {
    const userId = await resolveUserId();
    if (!userId) {
      return NextResponse.json({ error: "No user found" }, { status: 401 });
    }

    const stats = await readUserStats(userId);
    const checkins = await getUserCheckins(userId, 3);
    const currentWeek = getCurrentWeek();
    const weekData = WEEKS[currentWeek - 1];
    const nextWeekData = WEEKS[currentWeek] ?? null;

    // Build last 7 days activity summary
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentRuns = (stats.recentActivities ?? []).filter(
      (a) => (a.type === "Run" || a.sport_type === "Run") &&
             new Date(a.start_date_local).getTime() >= cutoff
    );

    const activityLines = recentRuns.length === 0
      ? "Ingen løpeturer siste 7 dager."
      : recentRuns.map((a) => {
          const km = (a.distance / 1000).toFixed(1);
          const pace = formatPace(a.moving_time / (a.distance / 1000));
          const date = new Date(a.start_date_local).toLocaleDateString("nb-NO", {
            weekday: "short", day: "numeric", month: "short",
          });
          const hr = a.average_heartrate ? ` | ${Math.round(a.average_heartrate)} bpm` : "";
          return `• ${date}: ${a.name} — ${km} km @ ${pace}/km${hr}`;
        }).join("\n");

    const totalKmWeek = recentRuns.reduce((s, a) => s + a.distance / 1000, 0);

    // Latest checkin
    const latestCheckin = checkins[0] ?? null;
    const checkinText = latestCheckin
      ? `SISTE UKERAPPORT (${latestCheckin.week_label ?? "ukjent uke"}, innlevert ${new Date(latestCheckin.created_at).toLocaleDateString("nb-NO")}):\n${latestCheckin.llm_response ?? latestCheckin.summary ?? "Ingen rapport."}`
      : "Ingen ukerapport tilgjengelig.";

    // Next week plan
    const nextWeekText = nextWeekData
      ? `Neste uke (uke ${currentWeek + 1}): ${nextWeekData.focus} — mål ${nextWeekData.totalKm} km (${nextWeekData.sessions.map((s) => `${s.type} ${s.km ? s.km + " km" : s.duration ?? ""}`).join(", ")})`
      : "Siste planuke nådd.";

    const today = new Date().toLocaleDateString("nb-NO", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });

    const systemPrompt = `Du er Hildes personlige løpecoach. Skriv en kort, varm og direkte statusmelding på norsk.

REGLER:
- Maks 3 korte avsnitt, ingen markdown-overskrifter
- Avsnitt 1: Hva Hilde har gjort siste uke (bruk faktiske tall fra Strava)
- Avsnitt 2: Hvordan Hilde selv har beskrevet innsats og feeling i siste ukerapport (med dato)
- Avsnitt 3: Hva som er planen fremover denne uken og neste uke
- Skriv direkte til Hilde ("du har", "du løp")
- Varm og motiverende tone, men realistisk
- Ingen emojis
- Ikke gjenta "Bergen City Marathon" i hver setning`;

    const userMessage = `DAGENS DATO: ${today}
GJELDENDE PLANUKE: ${currentWeek} — ${weekData?.focus ?? "ukjent"}

STRAVA SISTE 7 DAGER (${recentRuns.length} løpeturer, totalt ${totalKmWeek.toFixed(1)} km):
${activityLines}

${checkinText}

NESTE UKE:
${nextWeekText}

Skriv statusmeldingen nå.`;

    const client = getClient();
    const msg = await client.messages.create({
      model: MODELS.SONNET,
      max_tokens: 400,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const brief = msg.content[0].type === "text" ? msg.content[0].text : "";

    return NextResponse.json({
      brief,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[coach-brief] error:", err);
    return NextResponse.json({ error: "Failed to generate brief" }, { status: 500 });
  }
}
