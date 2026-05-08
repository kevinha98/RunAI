import { NextRequest } from "next/server";
import { llm, MODELS } from "@/lib/llm";
import { readUserStats } from "@/lib/stats-store";
import { formatPace } from "@/lib/strava-types";
import { createClient } from "@/lib/supabase/server";
import type { StoredStats } from "@/lib/strava-types";

function buildSystemPrompt(stats: StoredStats): string {
  const { athlete, computed, recentRuns } = stats;

  const athleteCtx = athlete
    ? `Utøver: ${athlete.firstname} ${athlete.lastname}`
    : "Utøver: ikke koblet til Strava ennå";

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
      ? "Siste løp:\n" +
        recentRuns
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

--- Utøverdata (oppdatert fra Strava) ---
${athleteCtx}
${metricsCtx}
${recentCtx}

--- Treningsfilosofi ---
- Gi konkrete råd basert på utøverens faktiske data
- Forklar HVORFOR bak hver økttype
- Vær støttende men ærlig om hva som kreves for å forbedre seg
- Hold svarene konsise med mindre dybde er genuint nødvendig
- Bruk format "M:SS/km" for fart
- Ved skade eller smerte: anbefal hvile og profesjonell vurdering uten å overdramatisere
- Foreslå konkrete planjusteringer med begrunnelse der det er relevant`;
}

export async function POST(req: NextRequest) {
  try {
    // Get logged-in user for their personal Strava data
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const stats = user ? await readUserStats(user.id) : { athlete: null, computed: { weeklyKm: 0, weeklyRuns: 0, avgPaceSecPerKm: 0, longestRunKm: 0, totalRunsAllTime: 0, totalKmAllTime: 0, ytdKm: 0 }, recentRuns: [], recentActivities: [], stravaStats: null, lastSync: "" };

    const body = await req.json();
    const { messages } = body as {
      messages: { role: "user" | "assistant"; content: string }[];
    };

    if (!messages || !Array.isArray(messages)) {
      return new Response("Invalid request body", { status: 400 });
    }

    const anthropicMessages = messages.filter((m) => m.content.trim().length > 0);

    const stream = llm.messages.stream({
      model: MODELS.SONNET,
      max_tokens: 1024,
      system: buildSystemPrompt(stats),
      messages: anthropicMessages,
    });

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              const chunk = JSON.stringify({
                choices: [{ delta: { content: event.delta.text } }],
              });
              controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
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
  } catch (err) {
    console.error("Coach API error:", err);
    return new Response("Internal server error", { status: 500 });
  }
}

