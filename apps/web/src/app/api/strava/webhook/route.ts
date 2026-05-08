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
import { getAthlete, getAthleteStats, getActivity, getActivities } from "@/lib/strava";
import {
  readStats,
  writeStats,
  computeMetrics,
  type StoredStats,
} from "@/lib/stats-store";

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
  owner_id: number;
  subscription_id: number;
  event_time: number;
  updates: Record<string, string>;
}

export async function POST(req: NextRequest) {
  // Respond 200 immediately — Strava requires a response within 2 seconds
  // We do async work after acknowledging receipt
  const event = (await req.json()) as StravaWebhookEvent;

  console.log(`[strava/webhook] Event: ${event.object_type}.${event.aspect_type} id=${event.object_id}`);

  // Handle deauthorization
  if (event.object_type === "athlete" && event.updates?.authorized === "false") {
    console.log("[strava/webhook] Athlete deauthorized — clearing stored stats");
    const current = readStats();
    writeStats({ ...current, athlete: null });
    revalidatePath("/dashboard");
    return new NextResponse(null, { status: 200 });
  }

  // Only handle activity events
  if (event.object_type !== "activity") {
    return new NextResponse(null, { status: 200 });
  }

  try {
    if (event.aspect_type === "create" || event.aspect_type === "update") {
      await syncActivity(event.object_id, event.aspect_type);
    } else if (event.aspect_type === "delete") {
      await removeActivity(event.object_id);
    }
  } catch (err) {
    // Log but don't fail — Strava won't retry 200 responses
    console.error("[strava/webhook] Error processing event:", err);
  }

  return new NextResponse(null, { status: 200 });
}

// ─── Sync helpers ────────────────────────────────────────────────────────────

async function syncActivity(activityId: number, reason: "create" | "update") {
  console.log(`[strava/webhook] Syncing activity ${activityId} (${reason})`);

  const [activity, athlete] = await Promise.all([
    getActivity(activityId),
    getAthlete(),
  ]);

  const stats = await getAthleteStats(athlete.id);
  const current = readStats();

  // Merge this activity into the stored list (deduplicate by id)
  const filtered = current.recentActivities.filter((a) => a.id !== activity.id);
  const allActivities = [activity, ...filtered].slice(0, 50); // keep last 50

  const runs = allActivities.filter(
    (a) => a.type === "Run" || a.sport_type === "Run"
  );

  const computed = computeMetrics(runs, stats);

  const updated: StoredStats = {
    lastSync: new Date().toISOString(),
    athlete,
    stravaStats: stats,
    recentActivities: allActivities,
    recentRuns: runs.slice(0, 20),
    computed,
  };

  writeStats(updated);

  // Bust Next.js page cache so the dashboard shows fresh data immediately
  revalidatePath("/dashboard");
  console.log(`[strava/webhook] Stats updated. Weekly km: ${computed.weeklyKm}`);
}

async function removeActivity(activityId: number) {
  console.log(`[strava/webhook] Removing activity ${activityId} from store`);
  const current = readStats();
  const allActivities = current.recentActivities.filter((a) => a.id !== activityId);
  const runs = allActivities.filter(
    (a) => a.type === "Run" || a.sport_type === "Run"
  );
  const computed = computeMetrics(runs, current.stravaStats);

  writeStats({
    ...current,
    recentActivities: allActivities,
    recentRuns: runs.slice(0, 20),
    computed,
    lastSync: new Date().toISOString(),
  });

  revalidatePath("/dashboard");
}
