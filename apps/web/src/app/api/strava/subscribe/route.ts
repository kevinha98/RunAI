/**
 * POST /api/strava/subscribe
 * Registers the webhook subscription with Strava.
 * Call this once after deploying — Strava will validate your callback URL.
 *
 * GET /api/strava/subscribe
 * Shows the current active subscription (if any).
 *
 * DELETE /api/strava/subscribe?id=<subscriptionId>
 * Deletes an existing subscription.
 *
 * Usage (curl):
 *   curl -X POST https://your-app.vercel.app/api/strava/subscribe
 *
 * For local dev, use ngrok:
 *   ngrok http 3000
 *   NEXT_PUBLIC_APP_URL=https://xxxx.ngrok.io  → then POST to /api/strava/subscribe
 */

import { NextRequest, NextResponse } from "next/server";

const STRAVA_SUBSCRIPTIONS_URL = "https://www.strava.com/api/v3/push_subscriptions";

// ─── POST — create subscription ──────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? `https://${req.headers.get("host")}`;

  const callbackUrl = `${appUrl}/api/strava/webhook`;
  const verifyToken = process.env.STRAVA_WEBHOOK_VERIFY_TOKEN;
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;

  if (!verifyToken || !clientId || !clientSecret) {
    return NextResponse.json(
      { error: "Missing STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, or STRAVA_WEBHOOK_VERIFY_TOKEN" },
      { status: 500 }
    );
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    callback_url: callbackUrl,
    verify_token: verifyToken,
  });

  const res = await fetch(STRAVA_SUBSCRIPTIONS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error("[strava/subscribe] Failed:", data);
    return NextResponse.json({ error: data }, { status: res.status });
  }

  console.log("[strava/subscribe] Subscription created:", data);
  return NextResponse.json({
    ok: true,
    subscription: data,
    callbackUrl,
    message: "Strava will now POST to your webhook on every activity event.",
  });
}

// ─── GET — list current subscriptions ────────────────────────────────────────

export async function GET() {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;

  const url = new URL(STRAVA_SUBSCRIPTIONS_URL);
  url.searchParams.set("client_id", clientId ?? "");
  url.searchParams.set("client_secret", clientSecret ?? "");

  const res = await fetch(url.toString());
  const data = await res.json();
  return NextResponse.json({ subscriptions: data });
}

// ─── DELETE — remove subscription ────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "?id= required" }, { status: 400 });

  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;

  const body = new URLSearchParams({
    client_id: clientId ?? "",
    client_secret: clientSecret ?? "",
  });

  const res = await fetch(`${STRAVA_SUBSCRIPTIONS_URL}/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (res.status === 204) return NextResponse.json({ ok: true, deleted: id });
  const data = await res.json();
  return NextResponse.json({ error: data }, { status: res.status });
}
