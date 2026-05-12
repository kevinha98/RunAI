import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { MODELS } from "@/lib/llm";
import { readUserStats } from "@/lib/stats-store";
import { formatPace } from "@/lib/strava-types";
import { createClient } from "@/lib/supabase/server";
import { getAnyStravaUserId } from "@/lib/db/user-strava";
import { saveCheckin, getUserCheckins } from "@/lib/db/checkins";
import { buildProfileBlock } from "@/lib/db/athlete-profile";
import { refreshAthleteProfile } from "@/app/api/profile/refresh/route";
import type { PlanAdjustment } from "@/lib/db/checkins";
import { WEEKS, getCurrentWeek, PLAN_START, TOTAL_WEEKS } from "@/lib/plan-data";

export const maxDuration = 60;

// ─── LLM client ──────────────────────────────────────────────────────────────

function getClient(): Anthropic {
  const apiKey = process.env.RADICAL_GATEWAY_TOKEN ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing LLM credentials");
  return new Anthropic({
    baseURL: "https://gateway.raicode.no",
    apiKey,
    defaultHeaders: { "x-api-key": apiKey },
  });
}

// ─── Auth helper ─────────────────────────────────────────────────────────────

async function resolveUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return user.id;
  return getAnyStravaUserId();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** ISO date (YYYY-MM-DD) of the Monday of the current plan week. */
function planWeekMonday(weekNumber: number): string {
  const ms = PLAN_START.getTime() + (weekNumber - 1) * 7 * 24 * 60 * 60 * 1000;
  return new Date(ms).toISOString().slice(0, 10);
}

/** Build a short text summary of the user's Strava runs in the past 7 days. */
function buildActivitySummary(stats: ReturnType<typeof Object.create>): string {
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const cutoff = Date.now() - weekMs;

  const recentRuns = (stats.recentActivities ?? []).filter(
    (a: { type: string; start_date_local: string }) =>
      a.type === "Run" && new Date(a.start_date_local).getTime() >= cutoff
  );

  if (recentRuns.length === 0) return "Ingen løpeturer registrert denne uken på Strava.";

  const lines = recentRuns.map(
    (a: { name: string; distance: number; moving_time: number; start_date_local: string; average_heartrate?: number }) => {
      const km = (a.distance / 1000).toFixed(1);
      const pace = formatPace(a.moving_time / (a.distance / 1000));
      const date = new Date(a.start_date_local).toLocaleDateString("nb-NO", {
        weekday: "short", day: "numeric", month: "short",
      });
      const hr = a.average_heartrate ? ` | Puls: ${Math.round(a.average_heartrate)} bpm` : "";
      return `• ${date}: ${a.name} — ${km} km @ ${pace}/km${hr}`;
    }
  );

  const totalKm = recentRuns.reduce(
    (s: number, a: { distance: number }) => s + a.distance / 1000, 0
  );

  return `${recentRuns.length} løpetur(er) siste 7 dager, totalt ${totalKm.toFixed(1)} km:\n${lines.join("\n")}`;
}

/** Build a text representation of the plan week's sessions. */
function buildPlanWeekText(weekNum: number): string {
  const w = WEEKS[weekNum - 1];
  if (!w) return `Uke ${weekNum}: ikke funnet i planen.`;
  const header = `Planuke ${w.week}/${TOTAL_WEEKS} — ${w.phase} | Planlagt: ${w.totalKm} km`;
  const sessions = w.sessions
    .map((s) => `  ${s.day}: ${s.icon} ${s.type} — ${s.distance} @ ${s.pace}`)
    .join("\n");
  const next = WEEKS[weekNum]; // weekNum is 1-based, so WEEKS[weekNum] = next week
  const nextLine = next
    ? `\nNeste uke (${next.week}): ${next.phase} — ${next.totalKm} km planlagt`
    : "";
  return `${header}\n${sessions}${nextLine}`;
}

// ─── Parse adjustments from Claude response ───────────────────────────────────

function parseAdjustments(text: string): PlanAdjustment[] {
  // Look for a JSON array between <adjustments> tags
  const match = text.match(/<adjustments>([\s\S]*?)<\/adjustments>/i);
  if (!match) return [];

  try {
    const parsed = JSON.parse(match[1].trim());
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is PlanAdjustment =>
        typeof item === "object" &&
        typeof item.weekNum === "number" &&
        typeof item.day === "string" &&
        typeof item.field === "string" &&
        typeof item.from === "string" &&
        typeof item.to === "string" &&
        typeof item.reason === "string"
    );
  } catch {
    return [];
  }
}

// ─── GET — fetch history ──────────────────────────────────────────────────────

export async function GET() {
  try {
    const userId = await resolveUserId();
    if (!userId) return NextResponse.json({ checkins: [] });

    const checkins = await getUserCheckins(userId, 10);

    // Map camelCase WeeklyCheckin → snake_case HistoryEntry (matches page interface)
    const mapped = checkins.map((c) => ({
      id: c.id,
      week_number: c.weekNumber,
      week_date: c.weekDate,
      user_report: c.userReport,
      llm_analysis: c.llmAnalysis,
      adjustments: c.adjustments ?? [],
      created_at: c.createdAt,
    }));

    return NextResponse.json({ checkins: mapped });
  } catch (err) {
    console.error("[api/checkin] GET error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ─── POST — submit weekly report + get LLM analysis ──────────────────────────

export async function POST(req: NextRequest) {
  try {
    const userId = await resolveUserId();
    if (!userId) return NextResponse.json({ error: "Ingen Strava-kobling funnet" }, { status: 401 });

    const body = await req.json();
    const userReport: string = (body.report ?? "").trim();
    const providedWeekDate: string | undefined =
      typeof body.weekDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.weekDate)
        ? body.weekDate
        : undefined;

    if (!userReport || userReport.length < 10) {
      return NextResponse.json({ error: "Rapporten er for kort" }, { status: 400 });
    }
    if (userReport.length > 4000) {
      return NextResponse.json({ error: "Rapporten er for lang (maks 4000 tegn)" }, { status: 400 });
    }

    // Compute week number — from provided date (backdated) or from today
    let currentWeek: number;
    let weekDate: string;
    if (providedWeekDate) {
      const msPerWeek = 7 * 24 * 60 * 60 * 1000;
      const elapsed = new Date(providedWeekDate).getTime() - PLAN_START.getTime();
      currentWeek = Math.min(TOTAL_WEEKS, Math.max(1, Math.floor(elapsed / msPerWeek) + 1));
      weekDate = providedWeekDate;
    } else {
      currentWeek = getCurrentWeek();
      weekDate = planWeekMonday(currentWeek);
    }

    // Load user's Strava data, training plan context, and athlete profile
    const [stats, profileBlock] = await Promise.all([
      readUserStats(userId),
      buildProfileBlock(userId),
    ]);
    const activitySummary = buildActivitySummary(stats);
    const planWeekText = buildPlanWeekText(currentWeek);

    // Date context for LLM
    const today = new Date();
    const todayISO = today.toISOString().slice(0, 10);
    const todayFormatted = today.toLocaleDateString("nb-NO", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const weekSundayISO = new Date(new Date(weekDate).getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const systemPrompt = `Du er en erfaren halvmaratontrener som hjelper en løper mot Bergen City Halvmaraton 24. april 2027.
${profileBlock ? "\n" + profileBlock + "\n" : ""}

DAGENS DATO: ${todayFormatted} (${todayISO})
GJELDENDE PLANUKE: Uke ${currentWeek}/${TOTAL_WEEKS}
UKEPERIODE: ${weekDate} (mandag) til ${weekSundayISO} (søndag)

Du mottar:
1. En ukerapport fra løperen (subjektiv opplevelse, form, eventuelle problemer)
2. Strava-data for uken (faktisk gjennomføring med datoer)
3. Treningsplanen for gjeldende uke

Din oppgave er å:
1. Analysere samsvaret mellom plan og gjennomføring
2. Gi konkrete, handlingsrettede råd
3. Foreslå justeringer til kommende ukes plan hvis nødvendig
4. Være ærlig og direkte — si klart fra om løperen trenger mer restitusjon eller bør øke belastningen
5. Relatere fremgang til tid igjen til løpet (Bergen City Halvmaraton 24. april 2027)

Svar på norsk. Bruk strukturert markdown (overskrifter, punktlister). Inkluder alltid dato-referanser i analysen.

Dersom du foreslår justeringer til treningsplanen, inkluder dem som en JSON-array mellom <adjustments>-tagger:
<adjustments>
[
  {
    "weekNum": ${currentWeek + 1},
    "day": "Man",
    "field": "distance",
    "from": "8 km",
    "to": "6 km",
    "reason": "Løperen rapporterer tretthet — reduser mandagsøkten for å sikre god restitusjon"
  }
]
</adjustments>

Hvis ingen justeringer er nødvendige, skriv <adjustments>[]</adjustments>.`;

    const userMessage = `## Ukerapport — Uke ${currentWeek}/${TOTAL_WEEKS} (${weekDate} til ${weekSundayISO})
**Rapport sendt:** ${todayFormatted}

### Min rapport
${userReport}

### Strava-aktivitet siste 7 dager
${activitySummary}

### Treningsplan for denne uken (${weekDate}–${weekSundayISO})
${planWeekText}

Analyser uken min og gi meg tilbakemelding. Foreslå eventuelle justeringer til neste uke.`;

    const client = getClient();
    const response = await client.messages.create({
      model: MODELS.SONNET,
      max_tokens: 2048,
      messages: [{ role: "user", content: userMessage }],
      system: systemPrompt,
    });

    const fullText = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    // Strip the <adjustments> block from the visible analysis
    const analysisText = fullText
      .replace(/<adjustments>[\s\S]*?<\/adjustments>/gi, "")
      .trim();

    const adjustments = parseAdjustments(fullText);

    // Persist to DB
    const saved = await saveCheckin({
      userId,
      weekNumber: currentWeek,
      weekDate,
      userReport,
      llmAnalysis: analysisText,
      adjustments,
    });

    // Fire-and-forget: refresh athlete profile with new data
    if (userId) {
      refreshAthleteProfile(userId).catch(() => {});
    }

    return NextResponse.json({
      id: saved?.id ?? null,
      weekNumber: currentWeek,
      analysis: analysisText,
      adjustments,
    });
  } catch (err) {
    console.error("[api/checkin] POST error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
