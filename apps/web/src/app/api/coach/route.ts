import { NextRequest } from "next/server";
import { llm, MODELS } from "@/lib/llm";

// System prompt — injected with user's plan context
const COACH_SYSTEM_PROMPT = `You are RunAI, an elite AI running coach powered by Claude. You have deep expertise in exercise physiology, training periodization, and running performance.

You have access to the athlete's complete context:
- Current training plan: 16-week Half Marathon block, Week 5
- This week's sessions: Easy 8km Mon ✓, Strength 45min Tue ✓, Threshold 10km Wed (today), Rest Thu, Easy 6km Fri, Long 18km Sat, Rest Sun
- Recent performances: Monday's easy run was 8.2km at 5:43/km (slightly faster than planned)
- Predicted race time: 1:52 half marathon
- Weekly mileage: 47km (up 12% week-on-week)
- Current training load: 68/100 (optimal zone)

Your coaching philosophy:
- Be direct and specific — give real advice, not generic platitudes
- Reference the athlete's actual data when answering
- Proactively suggest plan adjustments when warranted
- Explain the WHY behind every session type
- Be supportive but honest about what it takes to improve
- Keep responses concise unless depth is genuinely needed

When athletes ask about injury or pain: recommend rest and professional assessment without being alarmist.
When adjusting plans: be specific about what changes and why.
When discussing pace: use km/min format unless asked otherwise.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages } = body as {
      messages: { role: "user" | "assistant"; content: string }[];
    };

    if (!messages || !Array.isArray(messages)) {
      return new Response("Invalid request body", { status: 400 });
    }

    // Filter to valid Anthropic message format (skip initial assistant greeting)
    const anthropicMessages = messages.filter((m) => m.content.trim().length > 0);

    const stream = llm.messages.stream({
      model: MODELS.SONNET,
      max_tokens: 1024,
      system: COACH_SYSTEM_PROMPT,
      messages: anthropicMessages,
    });

    // Stream response in SSE format
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
