import { NextRequest, NextResponse } from "next/server";
import { llm, MODELS } from "@/lib/llm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { goal, level, fiveKTime, weeklyKm, daysPerWeek, raceDate } = body as {
      goal: string;
      level: string;
      fiveKTime?: string;
      weeklyKm?: string;
      daysPerWeek: string;
      raceDate?: string;
    };

    if (!goal || !level || !daysPerWeek) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const prompt = `Generate a personalized running training plan with the following athlete profile:

Goal distance: ${goal}
Current level: ${level}
Recent 5K time: ${fiveKTime || "Unknown"}
Current weekly mileage: ${weeklyKm || "Unknown"}
Training days per week: ${daysPerWeek}
Race date: ${raceDate || "Not specified — pick optimal duration"}
Today's date: ${new Date().toISOString().split("T")[0]}

Return a JSON object with this exact structure:
{
  "planName": "string",
  "totalWeeks": number,
  "raceDate": "YYYY-MM-DD",
  "predictedTime": "string (e.g. '1:52:00')",
  "weeklyStructure": [
    {
      "week": number,
      "phase": "Base | Build | Peak | Taper",
      "focus": "string",
      "totalKm": number,
      "sessions": [
        {
          "day": "Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday",
          "type": "Easy Run|Threshold|Interval|Long Run|Recovery|Strength|Mobility|Rest",
          "distance": "string",
          "targetPace": "string (MM:SS/km or 'N/A')",
          "description": "string (1-2 sentences of coaching context)"
        }
      ]
    }
  ],
  "coachingNotes": "string (paragraph of personalized insights and what to focus on)"
}

Return ONLY valid JSON. No markdown, no explanation.`;

    const message = await llm.messages.create({
      model: MODELS.SONNET,
      max_tokens: 8192,
      messages: [{ role: "user", content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      return NextResponse.json({ error: "Unexpected response type" }, { status: 500 });
    }

    // Strip any markdown code fences if present
    const jsonText = content.text.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
    const plan = JSON.parse(jsonText);

    return NextResponse.json({ plan });
  } catch (err) {
    console.error("Plan generation error:", err);
    return NextResponse.json({ error: "Failed to generate plan" }, { status: 500 });
  }
}
