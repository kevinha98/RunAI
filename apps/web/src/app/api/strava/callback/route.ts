/**
 * GET /api/strava/callback?code=...&scope=...
 *
 * OAuth 2.0 redirect handler — saves per-user tokens to Supabase DB.
 */
import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/strava";
import { createClient } from "@/lib/supabase/server";
import { upsertUserStrava } from "@/lib/db/user-strava";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL("/dashboard?strava=denied", req.nextUrl.origin)
    );
  }

  if (!code) {
    return NextResponse.json({ error: "Missing authorization code" }, { status: 400 });
  }

  // Get the logged-in user — session persists through the OAuth redirect
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
  }

  try {
    const tokens = await exchangeCodeForTokens(code);

    // Persist tokens + athlete to DB linked to this user
    await upsertUserStrava(user.id, {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: tokens.expires_at,
      strava_athlete_id: tokens.athlete?.id ?? null,
      athlete: tokens.athlete ?? null,
    });

    // Trigger immediate sync so dashboard shows data right away
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${req.headers.get("host")}`;
    fetch(`${appUrl}/api/strava/sync`, { method: "POST", headers: { "x-user-id": user.id } }).catch(() => {});

    return NextResponse.redirect(
      new URL("/dashboard?strava=connected", req.nextUrl.origin)
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[strava/callback] Error:", message);
    return NextResponse.redirect(
      new URL(`/dashboard?strava=error&msg=${encodeURIComponent(message)}`, req.nextUrl.origin)
    );
  }
}
