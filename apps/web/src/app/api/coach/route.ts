import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { MODELS } from "@/lib/llm";
import { readUserStats } from "@/lib/stats-store";
import { formatPace } from "@/lib/strava-types";
import { createClient } from "@/lib/supabase/server";
import { WEEKS, getCurrentWeek, RACE_DATE } from "@/lib/plan-data";
import type { StoredStats } from "@/lib/strava-types";

// Allow up to 60 s for the agentic tool loop on Vercel
export const maxDuration = 60;

// ─── Direct SDK client (avoids proxy binding issues in route context) ─────────
function getClient(): Anthropic {
  const apiKey = process.env.RADICAL_GATEWAY_TOKEN ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing LLM credentials — set RADICAL_GATEWAY_TOKEN");
  return new Anthropic({
    baseURL: "https://gateway.raicode.no/v1",
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
      "Henter treningsplanen — enten en spesifikk uke eller gjeldende uke. Bruk dette når brukeren spør om øktene denne uken, vil justere planen, eller spør om hva som kommer fremover.",
    input_schema: {
      type: "object" as const,
      properties: {
        week: {
          type: "number",
          description:
            "Ukenummer (1-12). Utelat for å hente gjeldende uke. Bruk -1 for å hente de neste 3 ukene.",
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
      // Next 3 weeks
      for (let i = currentWeek; i < currentWeek + 3 && i <= 12; i++) {
        weeksToShow.push(i);
      }
    } else if (requestedWeek && requestedWeek >= 1 && requestedWeek <= 12) {
      weeksToShow.push(requestedWeek);
    } else {
      weeksToShow.push(currentWeek);
    }

    const daysUntilRace = Math.ceil(
      (RACE_DATE.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    const planText = weeksToShow
      .map((wNum) => {
        const w = WEEKS[wNum - 1];
        if (!w) return `Uke ${wNum}: ikke funnet i planen.`;
        const sessions = w.sessions
          .map((s) => `  ${s.day}: ${s.type} — ${s.distance} @ ${s.pace}`)
          .join("\n");
        return `Uke ${w.week} (${w.phase}, ${w.totalKm} km totalt):\n${sessions}`;
      })
      .join("\n\n");

    return `Gjeldende uke: ${currentWeek}/12\nDager til Bergen City Marathon: ${daysUntilRace}\n\n${planText}`;
  }

  return `Ukjent verktøy: ${name}`;
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

  return `Du er RunAI, en AI-løpecoach drevet av Claude. Du svarer ALLTID på norsk (bokmål).
Du har dyp ekspertise innen treningsfysiologi, periodisering og løpsprestasjon.

<athlete_data>
Utøver: ${athleteCtx}
${metricsCtx}
Siste løp (snapshot — bruk get_full_activity_history for mer):
${recentCtx}
</athlete_data>

<available_tools>
- get_full_activity_history: Hent full aktivitetslogg (opp til 50 aktiviteter) for dypere analyse
- get_training_plan: Hent ukesplanen (gjeldende uke, spesifikk uke, eller neste 3 uker)
Bruk verktøyene proaktivt når spørsmålet krever mer data enn det som er i athlete_data.
</available_tools>

<coaching_philosophy>
- Gi konkrete råd basert på utøverens faktiske data — bruk verktøy om nødvendig
- Forklar HVORFOR bak hver økttype
- Vær støttende men ærlig om hva som kreves for å forbedre seg
- Hold svarene konsise med mindre dybde er genuint nødvendig
- Bruk format "M:SS/km" for fart
- Ved skade eller smerte: anbefal hvile og profesjonell vurdering uten å overdramatisere
- Foreslå konkrete planjusteringer med begrunnelse der det er relevant
</coaching_philosophy>`;
}

// ─── Route handler ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const stats = user
      ? await readUserStats(user.id)
      : {
          athlete: null,
          computed: { weeklyKm: 0, weeklyRuns: 0, avgPaceSecPerKm: 0, longestRunKm: 0, totalRunsAllTime: 0, totalKmAllTime: 0, ytdKm: 0 },
          recentRuns: [],
          recentActivities: [],
          stravaStats: null,
          lastSync: "",
        };

    const body = await req.json();
    const { messages } = body as {
      messages: { role: "user" | "assistant"; content: string }[];
    };

    if (!messages || !Array.isArray(messages)) {
      return new Response("Invalid request body", { status: 400 });
    }

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

    for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
      const response = await client.messages.create({
        model: MODELS.SONNET,
        max_tokens: 4096,
        system: buildSystemPrompt(stats),
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
        system: buildSystemPrompt(stats),
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

