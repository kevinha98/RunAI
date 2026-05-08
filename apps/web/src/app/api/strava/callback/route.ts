/**
 * GET /api/strava/callback?code=...&scope=...
 *
 * OAuth 2.0 redirect handler — Strava sends the user here after authorization.
 * Exchanges the one-time code for access + refresh tokens.
 *
 * In production: persist tokens to your database.
 * For now: logs tokens to console so you can paste them into .env.local.
 */
import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/strava";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  // User denied access
  if (error) {
    return NextResponse.redirect(
      new URL("/dashboard?strava=denied", req.nextUrl.origin)
    );
  }

  if (!code) {
    return NextResponse.json({ error: "Missing authorization code" }, { status: 400 });
  }

  try {
    const tokens = await exchangeCodeForTokens(code);

    // TODO: persist tokens to DB for multi-user apps.
    // For single-athlete setup, log them so you can update .env.local:
    console.log("[strava/callback] New tokens — update .env.local:");
    console.log(`  STRAVA_ACCESS_TOKEN=${tokens.access_token}`);
    console.log(`  STRAVA_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log(`  STRAVA_TOKEN_EXPIRES_AT=${tokens.expires_at}`);

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
