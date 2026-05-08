import Anthropic from "@anthropic-ai/sdk";
import type {
  PlanGenerationInput,
  GeneratedPlanJSON,
  TrainingPlan,
  UserProfile,
  Activity,
} from "@runai/types";

export function buildCoachSystemPrompt(
  user: Pick<UserProfile, "name" | "level" | "goal" | "daysPerWeek">,
  plan?: Pick<TrainingPlan, "planName" | "currentWeek" | "totalWeeks" | "raceDate" | "predictedTime" | "coachingNotes">,
  recentActivities?: Activity[]
): string {
  const raceInfo = plan?.raceDate
    ? `Race date: ${new Date(plan.raceDate).toLocaleDateString()}`
    : "No race date set";

  const activitySummary =
    recentActivities && recentActivities.length > 0
      ? recentActivities
          .slice(0, 5)
          .map(
            (a) =>
              `- ${new Date(a.recordedAt).toLocaleDateString()}: ${a.type} ${a.distanceKm ? `${a.distanceKm}km` : ""} ${a.avgPaceSec ? `@ ${formatPace(a.avgPaceSec)}/km` : ""}`
          )
          .join("\n")
      : "No recent activities logged yet.";

  return `You are RunAI, an elite AI running coach. You are coaching ${user.name}, a ${user.level}-level runner training for a ${user.goal.replace("_", " ")}.

ATHLETE CONTEXT:
- Training days per week: ${user.daysPerWeek}
- ${plan ? `Current plan: ${plan.planName}, Week ${plan.currentWeek} of ${plan.totalWeeks}` : "No active plan yet"}
- ${raceInfo}
- ${plan?.predictedTime ? `Predicted race time: ${plan.predictedTime}` : ""}

RECENT ACTIVITIES:
${activitySummary}

${plan?.coachingNotes ? `COACHING NOTES:\n${plan.coachingNotes}` : ""}

YOUR COACHING STYLE:
- Direct and specific — reference the athlete's actual data
- Explain the physiological WHY behind sessions
- Proactively suggest adjustments when needed
- Supportive but honest about requirements for improvement
- Concise unless depth is genuinely needed
- For pain/injury: recommend rest and professional assessment

Use km and min/km pacing. Keep responses focused and actionable.`;
}

export async function generatePlan(
  client: Anthropic,
  input: PlanGenerationInput
): Promise<GeneratedPlanJSON> {
  const today = new Date().toISOString().split("T")[0];

  const prompt = `Generate a personalized running training plan for this athlete:

Goal: ${input.goal}
Level: ${input.level}
Recent 5K time: ${input.fiveKTime ?? "Unknown"}
Current weekly mileage: ${input.weeklyKm ?? "Unknown"}
Training days/week: ${input.daysPerWeek}
Race date: ${input.raceDate ?? "Not specified — choose optimal duration"}
Today: ${today}

Return ONLY a valid JSON object matching this schema exactly:
{
  "planName": string,
  "totalWeeks": number,
  "raceDate": "YYYY-MM-DD",
  "predictedTime": string,
  "weeklyStructure": [{
    "week": number,
    "phase": "Base|Build|Peak|Taper",
    "focus": string,
    "totalKm": number,
    "sessions": [{
      "day": "Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday",
      "type": "Easy Run|Threshold|Interval|Long Run|Recovery|Strength|Mobility|Rest",
      "distance": string,
      "targetPace": string,
      "description": string
    }]
  }],
  "coachingNotes": string
}

No markdown. No explanation. Pure JSON only.`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 8192,
    messages: [{ role: "user", content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }

  const jsonText = content.text
    .replace(/^```json\n?/, "")
    .replace(/\n?```$/, "")
    .trim();

  return JSON.parse(jsonText) as GeneratedPlanJSON;
}

export async function regeneratePlan(
  client: Anthropic,
  originalInput: PlanGenerationInput,
  completedWeeks: number,
  performanceSummary: string
): Promise<GeneratedPlanJSON> {
  const today = new Date().toISOString().split("T")[0];

  const prompt = `Regenerate a running training plan for an athlete who has completed ${completedWeeks} weeks. 
Adjust based on their actual performance:

${performanceSummary}

Original plan input:
Goal: ${originalInput.goal}
Level: ${originalInput.level}
Race date: ${originalInput.raceDate ?? "Not specified"}
Training days/week: ${originalInput.daysPerWeek}
Today: ${today}

Generate an updated plan for the REMAINING weeks only. 
Return ONLY valid JSON in the same schema as before. No markdown.`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 8192,
    messages: [{ role: "user", content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type");

  const jsonText = content.text
    .replace(/^```json\n?/, "")
    .replace(/\n?```$/, "")
    .trim();

  return JSON.parse(jsonText) as GeneratedPlanJSON;
}

function formatPace(secondsPerKm: number): string {
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = secondsPerKm % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export { formatPace };
