/**
 * /api/strava/webhook
 *
 * GET  — Strava subscription validation (called once when registering webhook)
 * POST — Strava event delivery (called on every create/update/delete)
 *
 * Docs: https://developers.strava.com/docs/webhooks/
 */

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getActivityForUser, getAthleteForUser, getAthleteStatsForUser } from "@/lib/strava";
import { computeMetrics, writeUserStats, readUserStats, type StoredStats } from "@/lib/stats-store";
import { getUserIdByStravaAthleteId, updateUserStravaStats } from "@/lib/db/user-strava";

// ─── GET — subscription validation ──────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.STRAVA_WEBHOOK_VERIFY_TOKEN) {
    console.log("[strava/webhook] Subscription validated by Strava");
    return NextResponse.json({ "hub.challenge": challenge });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// ─── POST — event delivery ────────────────────────────────────────────────────

interface StravaWebhookEvent {
  object_type: "activity" | "athlete";
  aspect_type: "create" | "update" | "delete";
  object_id: number;
  owner_id: number; // Strava athlete ID
  subscription_id: number;
  event_time: number;
  updates: Record<string, string>;
}

// In-memory dedup cache: eventKey → timestamp processed
// Prevents double-processing if Strava retries within the same instance lifetime
const processedEvents = new Map<string, number>();
const DEDUP_TTL_MS = 5 * 60 * 1000; // 5 minutes

/** Returns true if this event was already processed recently */
function isDuplicate(event: StravaWebhookEvent): boolean {
  const key = `${event.object_type}.${event.aspect_type}.${event.object_id}.${event.event_time}`;
  const now = Date.now();

  // Prune stale entries
  for (const [k, ts] of processedEvents.entries()) {
    if (now - ts > DEDUP_TTL_MS) processedEvents.delete(k);
  }

  if (processedEvents.has(key)) return true;
  processedEvents.set(key, now);
  return false;
}

export async function POST(req: NextRequest) {
  // Respond 200 immediately — Strava requires a response within 2 seconds
  const event = (await req.json()) as StravaWebhookEvent;

  console.log(
    `[strava/webhook] Event: ${event.object_type}.${event.aspect_type}` +
      ` id=${event.object_id} owner=${event.owner_id}`
  );

  if (isDuplicate(event)) {
    console.log(`[strava/webhook] Duplicate event — skipping`);
    return new NextResponse(null, { status: 200 });
  }

  // Look up which RunAI user owns this Strava athlete_id
  const userId = await getUserIdByStravaAthleteId(event.owner_id);
  if (!userId) {
    console.log(
      `[strava/webhook] No user found for Strava athlete ${event.owner_id} — ignoring`
    );
    return new NextResponse(null, { status: 200 });
  }

  // Handle deauthorization
  if (event.object_type === "athlete" && event.updates?.authorized === "false") {
    console.log(`[strava/webhook] Athlete ${event.owner_id} deauthorized`);
    await updateUserStravaStats(userId, { athlete: undefined });
    revalidatePath("/dashboard");
    return new NextResponse(null, { status: 200 });
  }

  // Only handle activity events
  if (event.object_type !== "activity") {
    return new NextResponse(null, { status: 200 });
  }

  try {
    if (event.aspect_type === "create" || event.aspect_type === "update") {
      await syncActivity(userId, event.object_id, event.aspect_type);
    } else if (event.aspect_type === "delete") {
      await removeActivity(userId, event.object_id);
    }
  } catch (err) {
    console.error("[strava/webhook] Error processing event:", err);
  }

  return new NextResponse(null, { status: 200 });
}

// ─── Sync helpers ────────────────────────────────────────────────────────────

async function syncActivity(
  userId: string,
  activityId: number,
  reason: "create" | "update"
) {
  console.log(
    `[strava/webhook] Syncing activity ${activityId} for user ${userId} (${reason})`
  );

  const [activity, athlete] = await Promise.all([
    getActivityForUser(userId, activityId),
    getAthleteForUser(userId),
  ]);

  const stravaStats = await getAthleteStatsForUser(userId, athlete.id);
  const current = await readUserStats(userId);

  const filtered = current.recentActivities.filter((a) => a.id !== activity.id);
  const allActivities = [activity, ...filtered].slice(0, 50);
  const runs = allActivities.filter(
    (a) => a.type === "Run" || a.sport_type === "Run"
  );
  const computed = computeMetrics(runs, stravaStats);

  const updated: StoredStats = {
    lastSync: new Date().toISOString(),
    athlete,
    stravaStats,
    recentActivities: allActivities,
    recentRuns: runs.slice(0, 20),
    computed,
  };

  await writeUserStats(userId, updated);
  revalidatePath("/dashboard");
  console.log(
    `[strava/webhook] Updated stats for user ${userId}. Weekly km: ${computed.weeklyKm}`
  );
}

async function removeActivity(userId: string, activityId: number) {
  console.log(
    `[strava/webhook] Removing activity ${activityId} for user ${userId}`
  );

  const current = await readUserStats(userId);
  const allActivities = current.recentActivities.filter(
    (a) => a.id !== activityId
  );
  const runs = allActivities.filter(
    (a) => a.type === "Run" || a.sport_type === "Run"
  );
  const computed = computeMetrics(runs, current.stravaStats);

  await writeUserStats(userId, {
    ...current,
    recentActivities: allActivities,
    recentRuns: runs.slice(0, 20),
    computed,
    lastSync: new Date().toISOString(),
  });

  revalidatePath("/dashboard");
  console.log(
    `[strava/webhook] Removed activity ${activityId} for user ${userId}. Remaining activities: ${allActivities.length}`
  );
}
