/**
 * GET /api/strava/connect
 * Requires the user to be logged in, then redirects to Strava OAuth.
 */
import { NextRequest, NextResponse } from "next/server";
import { buildAuthUrl } from "@/lib/strava";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  // Must be logged in
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? `https://${req.headers.get("host")}`;
  const redirectUri = `${appUrl}/api/strava/callback`;
  const authUrl = buildAuthUrl(redirectUri);
  return NextResponse.redirect(authUrl);
}
