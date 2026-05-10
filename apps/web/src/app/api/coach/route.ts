import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { MODELS } from "@/lib/llm";
import { readUserStats } from "@/lib/stats-store";
import { formatPace } from "@/lib/strava-types";
import { createClient } from "@/lib/supabase/server";
import { WEEKS, getCurrentWeek, RACE_DATE, TOTAL_WEEKS } from "@/lib/plan-data";
import type { StoredStats } from "@/lib/strava-types";

// Allow up to 60 s for the agentic tool loop on Vercel
export const maxDuration = 60;

// ─── Direct SDK client (avoids proxy binding issues in route context) ─────────
function getClient(): Anthropic {
  const apiKey = process.env.RADICAL_GATEWAY_TOKEN ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing LLM credentials — set RADICAL_GATEWAY_TOKEN");
  return new Anthropic({
    baseURL: "https://gateway.raicode.no",
    apiKey,
    defaultHeaders: { "x-api-key": apiKey },
  });
}

// ─── Context window management ───────────────────────────────────────────────
// Keep at most 20 messages to prevent token limit issues in long sessions.
const MAX_HISTORY_MESSAGES = 20;

// ─── Tool definitions ─────────────────────────────────────────────────────────
const COACH_TOOLS: Anthropic.Tool[] = [
  {
    name: "get_full_activity_history",
    description:
      "Henter utøverens fulle aktivitetshistorikk (opp til 50 aktiviteter). Bruk dette når brukeren spør om mønstre over tid, savnet trening, belastningsutvikling, eller når du trenger mer data enn de 5 siste løpene.",
    input_schema: {
      type: "object" as const,
      properties: {
        activity_type: {
          type: "string",
          enum: ["run", "all"],
          description: "Filtrer på type. 'run' = kun løp, 'all' = alle aktiviteter.",
        },
      },
      required: [],
    },
  },
  {
    name: "get_training_plan",
    description:
      "Henter treningsplanen — enten en spesifikk uke eller gjeldende uke. Bruk dette når brukeren spør om øktene denne uken, vil justere planen, eller spør om hva som kommer fremover. Send week: -1 for å hente de neste 3 ukene og gi fremoverskuende råd om nedtrapping og toppform.",
    input_schema: {
      type: "object" as const,
      properties: {
        week: {
          type: "number",
          description:
            "Ukenummer (1-52). Utelat eller send 0 for å hente gjeldende uke + de 3 neste. Send -1 for å hente de neste 3 ukene fra gjeldende uke.",
        },
      },
      required: [],
    },
  },
];

// ─── Tool executor ────────────────────────────────────────────────────────────
function executeTool(
  name: string,
  input: Record<string, unknown>,
  stats: StoredStats
): string {
  if (name === "get_full_activity_history") {
    const type = (input.activity_type as string) ?? "all";
    const activities =
      type === "run"
        ? stats.recentActivities.filter((a) => a.type === "Run")
        : stats.recentActivities;

    if (activities.length === 0) return "Ingen aktiviteter registrert.";

    return activities
      .slice(0, 50)
      .map((a) => {
        const km = (a.distance / 1000).toFixed(1);
        const pace = formatPace(a.moving_time / (a.distance / 1000));
        const date = new Date(a.start_date_local).toLocaleDateString("nb-NO", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
        return `${date}: ${a.name} — ${km} km @ ${pace}/km (${a.type})`;
      })
      .join("\n");
  }

  if (name === "get_training_plan") {
    const currentWeek = getCurrentWeek();
    const requestedWeek = input.week as number | undefined;
    const weeksToShow: number[] = [];

    if (requestedWeek === -1) {
      // Neste 3 uker fra og med gjeldende uke
      for (let i = currentWeek; i < currentWeek + 3 && i <= TOTAL_WEEKS; i++) {
        weeksToShow.push(i);
      }
    } else if (
      requestedWeek !== undefined &&
      requestedWeek >= 1 &&
      requestedWeek <= TOTAL_WEEKS
    ) {
      weeksToShow.push(requestedWeek);
    } else {
      // Standard: gjeldende uke + de 3 neste
      for (let i = currentWeek; i < currentWeek + 4 && i <= TOTAL_WEEKS; i++) {
        weeksToShow.push(i);
      }
    }

    const daysUntilRace = Math.ceil(
      (RACE_DATE.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    const raceDateFormatted = RACE_DATE.toLocaleDateString("nb-NO", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const planText = weeksToShow
      .map((wNum) => {
        const w = WEEKS[wNum - 1];
        if (!w) {
          return `Uke ${wNum}: ikke funnet i planen.`;
        }

        const isCurrentWeek = wNum === currentWeek;
        const weekHeader = `=== Uke ${w.week}/${TOTAL_WEEKS} — ${w.phase}${
          isCurrentWeek ? " (GJELDENDE UKE)" : ""
        } | Totalt: ${w.totalKm} km ===`;

        const sessions = w.sessions
          .map((s) => {
            // Skill mellom beskrivende pace (f.eks. "Restitusjon") og faktisk pace
            const paceIsDescriptive =
              s.pace === "Restitusjon" ||
              s.pace === "Kjerneaktivering" ||
              s.pace === "Dynamisk" ||
              s.pace.startsWith("Bein") ||
              s.pace.startsWith("Full") ||
              s.distance === "—";
            const paceStr = paceIsDescriptive
              ? ` (${s.pace})`
              : ` @ ${s.pace}`;
            return `  ${s.day}: ${s.icon} ${s.type} — ${s.distance}${paceStr}`;
          })
          .join("\n");

        return `${weekHeader}\n${sessions}`;
      })
      .join("\n\n");

    // Finn neste nedtrappingsuke
    const nextTaperWeek = WEEKS.slice(currentWeek).find(
      (w) => w.phase === "Nedtrapping"
    );
    const taperNote = nextTaperWeek
      ? `Nedtrapping starter uke ${nextTaperWeek.week} (om ${
          nextTaperWeek.week - currentWeek
        } uke${nextTaperWeek.week - currentWeek !== 1 ? "r" : ""}).`
      : "";

    // Fremoverskuende notat om neste uke (hvis ikke allerede vist)
    const nextWeekNum = currentWeek + 1;
    const nextWeekData = WEEKS[nextWeekNum - 1];
    const upcomingNote =
      nextWeekData && !weeksToShow.includes(nextWeekNum)
        ? `\nNeste uke (uke ${nextWeekNum}): ${nextWeekData.phase} — ${nextWeekData.totalKm} km planlagt`
        : "";

    return (
      `Gjeldende planuke: ${currentWeek}/${TOTAL_WEEKS}\n` +
      `Dager til Bergen City Halvmaraton (${raceDateFormatted}): ${daysUntilRace}\n` +
      (taperNote ? `${taperNote}\n` : "") +
      `\n${planText}` +
      upcomingNote
    );
  }

  return `Ukjent verktøy: ${name}`;
}

// ─── Weekly history context builder ──────────────────────────────────────────
interface WeeklyBucket {
  weekLabel: string;
  runs: number;
  km: number;
  avgPace: string | null;
}

interface TrainingContext {
  currentPlanWeek: number;
  currentPhase: string;
  planWeekKm: number;
  daysToRace: number;
  last4Weeks: WeeklyBucket[];
}

function buildWeeklyHistoryContext(stats: StoredStats): TrainingContext {
  const now = Date.now();
  const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

  // Finn starten på gjeldende ISO-uke (mandag 00:00)
  const nowDate = new Date(now);
  const dayOfWeek = nowDate.getDay(); // 0 = søndag
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const currentWeekStart = new Date(nowDate);
  currentWeekStart.setHours(0, 0, 0, 0);
  currentWeekStart.setDate(nowDate.getDate() - daysFromMonday);

  const last4Weeks: WeeklyBucket[] = [];

  for (let offset = 0; offset >= -3; offset--) {
    const weekStart = new Date(currentWeekStart.getTime() + offset * MS_PER_WEEK);
    const weekEnd = new Date(weekStart.getTime() + MS_PER_WEEK);

    const weekRuns = stats.recentActivities.filter((a) => {
      if (a.type !== "Run") return false;
      const t = new Date(a.start_date_local).getTime();
      return t >= weekStart.getTime() && t < weekEnd.getTime();
    });

    const totalKm = weekRuns.reduce((sum, a) => sum + a.distance / 1000, 0);
    const totalTimeSec = weekRuns.reduce((sum, a) => sum + a.moving_time, 0);
    const avgPaceSecPerKm = totalKm > 0 ? totalTimeSec / totalKm : null;

    const startLabel = weekStart.toLocaleDateString("nb-NO", {
      day: "numeric",
      month: "short",
    });

    last4Weeks.push({
      weekLabel: offset === 0 ? `Denne uken (fra ${startLabel})` : `Uke fra ${startLabel}`,
      runs: weekRuns.length,
      km: Math.round(totalKm * 10) / 10,
      avgPace: avgPaceSecPerKm !== null ? formatPace(avgPaceSecPerKm) : null,
    });
  }

  const currentWeekNum = getCurrentWeek();
  const currentWeekData = WEEKS[currentWeekNum - 1];
  const currentPhase = currentWeekData?.phase ?? "Ukjent fase";
  const planWeekKm = currentWeekData?.totalKm ?? 0;

  const daysToRace = Math.ceil(
    (RACE_DATE.getTime() - now) / (1000 * 60 * 60 * 24)
  );

  return {
    currentPlanWeek: currentWeekNum,
    currentPhase,
    planWeekKm,
    daysToRace,
    last4Weeks,
  };
}

// ─── Running history context builder (last 7 days detail) ────────────────────
function buildRunningHistoryContext(stats: StoredStats): string {
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  const runsLast7Days = stats.recentActivities.filter(
    (a) => a.type === "Run" && new Date(a.start_date_local).getTime() >= sevenDaysAgo
  );

  const kmLast7Days = runsLast7Days.reduce((sum, a) => sum + a.distance / 1000, 0);
  const runCountLast7Days = runsLast7Days.length;

  const currentWeekNum = getCurrentWeek();
  const currentWeekData = WEEKS[currentWeekNum - 1];
  const phase = currentWeekData?.phase ?? "Ukjent fase";
  const planWeekKm = currentWeekData?.totalKm ?? 0;

  const daysUntilRace = Math.ceil(
    (RACE_DATE.getTime() - now) / (1000 * 60 * 60 * 24)
  );

  const lines: string[] = [
    `Gjeldende planuke: ${currentWeekNum}/${TOTAL_WEEKS} — Fase: ${phase}`,
    `Planlagt km denne uken: ${planWeekKm} km`,
    `Faktiske løp siste 7 dager: ${runCountLast7Days} løp — ${kmLast7Days.toFixed(1)} km totalt`,
    `Dager til Bergen City Halvmaraton: ${daysUntilRace}`,
  ];

  if (runsLast7Days.length > 0) {
    const detail = runsLast7Days
      .slice(0, 7)
      .map((a) => {
        const km = (a.distance / 1000).toFixed(1);
        const pace = formatPace(a.moving_time / (a.distance / 1000));
        const date = new Date(a.start_date_local).toLocaleDateString("nb-NO", {
          day: "numeric",
          month: "short",
        });
        return `  ${date}: ${a.name} — ${km} km @ ${pace}/km`;
      })
      .join("\n");
    lines.push(`Detaljer siste 7 dager:\n${detail}`);
  } else {
    lines.push("Ingen registrerte løp siste 7 dager.");
  }

  if (planWeekKm > 0 && kmLast7Days > 0) {
    const pct = Math.round((kmLast7Days / planWeekKm) * 100);
    lines.push(`Gjennomføring ift. plan: ${pct}% (${kmLast7Days.toFixed(1)} av ${planWeekKm} km)`);
  }

  return lines.join("\n");
}

// ─── System prompt ────────────────────────────────────────────────────────────
function buildSystemPrompt(stats: StoredStats): string {
  const { athlete, computed, recentRuns } = stats;

  const athleteCtx = athlete
    ? `${athlete.firstname} ${athlete.lastname}`
    : "Ikke koblet til Strava ennå";

  const metricsCtx =
    computed.weeklyKm > 0
      ? [
          `Ukentlig km (denne uken): ${computed.weeklyKm} km (${computed.weeklyRuns} økt${computed.weeklyRuns !== 1 ? "er" : ""})`,
          `Gjennomsnittsfart (siste 5 løp): ${formatPace(computed.avgPaceSecPerKm)} /km`,
          `Lengste løp (30 dager): ${computed.longestRunKm} km`,
          `Hittil i år: ${computed.ytdKm} km`,
          `Totalt antall løp: ${computed.totalRunsAllTime}`,
        ].join("\n")
      : "Ingen Strava-data tilgjengelig ennå — brukeren har ikke koblet til Strava.";

  const recentCtx =
    recentRuns.length > 0
      ? recentRuns
          .slice(0, 5)
          .map((r) => {
            const km = (r.distance / 1000).toFixed(1);
            const pace = formatPace(r.moving_time / (r.distance / 1000));
            const date = new Date(r.start_date_local).toLocaleDateString("nb-NO", {
              day: "numeric",
              month: "short",
            });
            return `- ${date}: ${r.name} — ${km} km @ ${pace}/km`;
          })
          .join("\n")
      : "Ingen nylige aktiviteter registrert.";

  const runningHistoryCtx = buildRunningHistoryContext(stats);

  // Build structured 4-week training context as compact JSON
  const trainingContext = buildWeeklyHistoryContext(stats);
  const trainingContextJson = JSON.stringify(trainingContext);

  return `Du er RunAI, en AI-løpecoach drevet av Claude. Du svarer ALLTID på norsk (bokmål).
Du har dyp ekspertise innen treningsfysiologi, periodisering og løpsprestasjon.

<training_context>
${trainingContextJson}
Bruk disse dataene aktivt: henvis til faktiske km-tall, pace og fase når du gir råd. Kommenter trender — f.eks. om km-volumet øker/synker over ukene, om pacetrenden er positiv, og hvor godt gjennomføringen ligger an mot planen. Dager til løpet skal styre råd om belastning og taper.
</training_context>

<athlete_data>
Utøver: ${athleteCtx}
${metricsCtx}
Siste løp (snapshot — bruk get_full_activity_history for mer):
${recentCtx}
</athlete_data>

<running_history>
${runningHistoryCtx}
</running_history>

<available_tools>
- get_full_activity_history: Hent full aktivitetslogg (opp til 50 aktiviteter) for dypere analyse
- get_training_plan: Hent ukesplanen (gjeldende uke + 3 neste som standard, spesifikk uke, eller week: -1 for neste 3 uker). Bruk proaktivt når brukeren spør om kommende trening, ukesplan eller treningsbelastning.
</available_tools>

<coaching_philosophy>
- Gi konkrete råd basert på utøverens faktiske data — bruk verktøy om nødvendig
- Forklar HVORFOR bak hver økttype
- Vær støttende men ærlig om hva som kreves for å forbedre seg
- Hold svarene konsise med mindre dybde er genuint nødvendig
- Bruk format "M:SS/km" for fart
- Ved skade eller smerte: anbefal hvile og profesjonell vurdering uten å overdramatisere
- Foreslå konkrete planjusteringer med begrunnelse der det er relevant
- Bruk get_training_plan automatisk når brukeren spør om ukesplan, kommende økt, treningsbelastning eller fremtidig periodisering
</coaching_philosophy>`;
}

// ─── Route handler ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, userId: bodyUserId } = body as {
      messages: { role: "user" | "assistant"; content: string }[];
      userId?: string;
    };

    if (!messages || !Array.isArray(messages)) {
      return new Response("Invalid request body", { status: 400 });
    }

    // Resolve userId: from body first, then from Supabase session
    let resolvedUserId: string | null = bodyUserId ?? null;
    if (!resolvedUserId) {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      resolvedUserId = user?.id ?? null;
    }

    // Load stats (falls back to empty stats if no userId)
    const stats: StoredStats = resolvedUserId
      ? await readUserStats(resolvedUserId)
      : {
          athlete: null,
          computed: {
            weeklyKm: 0,
            weeklyRuns: 0,
            avgPaceSecPerKm: 0,
            longestRunKm: 0,
            totalRunsAllTime: 0,
            totalKmAllTime: 0,
            ytdKm: 0,
          },
          recentRuns: [],
          recentActivities: [],
          stravaStats: null,
          lastSync: "",
        };

    // Context window management: keep last N messages, always end on a user message
    let trimmed = messages
      .filter((m) => m.content.trim().length > 0)
      .slice(-MAX_HISTORY_MESSAGES);
    // Ensure we don't start with an assistant message (Anthropic API requires user first)
    while (trimmed.length > 0 && trimmed[0].role === "assistant") {
      trimmed = trimmed.slice(1);
    }

    // ─── Agentic tool-use loop ───────────────────────────────────────────────
    let currentMessages: Anthropic.MessageParam[] = trimmed.map((m) => ({
      role: m.role,
      content: m.content,
    }));
    let finalText: string | null = null;
    const MAX_TOOL_TURNS = 5;

    const client = getClient();
    const systemPrompt = buildSystemPrompt(stats);

    for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
      const response = await client.messages.create({
        model: MODELS.SONNET,
        max_tokens: 4096,
        system: systemPrompt,
        tools: COACH_TOOLS,
        messages: currentMessages,
      });

      if (response.stop_reason !== "tool_use") {
        finalText = response.content
          .filter((b): b is Anthropic.TextBlock => b.type === "text")
          .map((b) => b.text)
          .join("");
        break;
      }

      // Execute all tool calls in parallel
      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      );

      const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
        toolUseBlocks.map(async (block) => ({
          type: "tool_result" as const,
          tool_use_id: block.id,
          content: executeTool(block.name, block.input as Record<string, unknown>, stats),
        }))
      );

      currentMessages = [
        ...currentMessages,
        { role: "assistant" as const, content: response.content },
        { role: "user" as const, content: toolResults },
      ];
    }

    const encoder = new TextEncoder();

    // ─── If tool loop hit max turns without a final text, stream a closing call ─
    if (finalText === null) {
      const stream = client.messages.stream({
        model: MODELS.SONNET,
        max_tokens: 4096,
        system: systemPrompt,
        tools: [],
        messages: currentMessages,
      });

      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            for await (const event of stream) {
              if (
                event.type === "content_block_delta" &&
                event.delta.type === "text_delta"
              ) {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ choices: [{ delta: { content: event.delta.text } }] })}\n\n`
                  )
                );
              }
            }
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          } catch (err) {
            controller.error(err);
          }
        },
      });

      return new Response(readableStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // ─── Send final text (already collected) as SSE ───────────────────────────
    const readableStream = new ReadableStream({
      start(controller) {
        if (finalText) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ choices: [{ delta: { content: finalText } }] })}\n\n`
            )
          );
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("Coach API error:", err);
    return new Response("Internal server error", { status: 500 });
  }
}
