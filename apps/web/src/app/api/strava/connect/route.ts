/**
 * GET /api/strava/connect
 * Redirects the user to Strava's OAuth authorization page.
 */
import { NextRequest, NextResponse } from "next/server";
import { buildAuthUrl } from "@/lib/strava";

export async function GET(req: NextRequest) {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? `https://${req.headers.get("host")}`;
  const redirectUri = `${appUrl}/api/strava/callback`;
  const authUrl = buildAuthUrl(redirectUri);
  return NextResponse.redirect(authUrl);
}
