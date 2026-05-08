/**
 * GET /api/debug
 * Diagnostic endpoint — checks all external connections.
 * REMOVE before going public.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { buildAuthUrl } from "@/lib/strava";

export async function GET() {
  const results: Record<string, unknown> = {};

  // 1. Env vars
  results.env = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? "✅ set" : "❌ missing",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "✅ set" : "❌ missing",
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? "✅ set" : "❌ missing",
    STRAVA_CLIENT_ID: process.env.STRAVA_CLIENT_ID || "❌ missing",
    STRAVA_CLIENT_SECRET: process.env.STRAVA_CLIENT_SECRET ? "✅ set" : "❌ missing",
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "❌ missing",
  };

  // 2. Supabase session (anon client)
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    results.session = user
      ? { status: "✅ logged in", id: user.id, email: user.email }
      : { status: "❌ not logged in", error: error?.message };
  } catch (e) {
    results.session = { status: "❌ error", error: String(e) };
  }

  // 3. Supabase service client + user_strava table
  try {
    const svc = createServiceClient();
    const { data, error } = await svc.from("user_strava").select("user_id").limit(1);
    if (error) {
      results.supabase_db = { status: "❌ table error", error: error.message, hint: "Did you run the SQL migration?" };
    } else {
      results.supabase_db = { status: "✅ user_strava table exists", rows: data?.length ?? 0 };
    }
  } catch (e) {
    results.supabase_db = { status: "❌ service client error", error: String(e) };
  }

  // 4. Current user's Strava row
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const svc = createServiceClient();
      const { data, error } = await svc
        .from("user_strava")
        .select("user_id, strava_athlete_id, last_sync, token_expires_at")
        .eq("user_id", user.id)
        .single();
      if (error?.code === "PGRST116") {
        results.user_strava = { status: "⚠️ no Strava connection yet for this user" };
      } else if (error) {
        results.user_strava = { status: "❌ error", error: error.message };
      } else {
        const now = Math.floor(Date.now() / 1000);
        results.user_strava = {
          status: "✅ connected",
          athlete_id: data.strava_athlete_id,
          last_sync: data.last_sync,
          token_valid: data.token_expires_at > now ? "✅ not expired" : "❌ expired — will auto-refresh",
        };
      }
    } else {
      results.user_strava = { status: "⚠️ skipped — not logged in" };
    }
  } catch (e) {
    results.user_strava = { status: "❌ error", error: String(e) };
  }

  // 5. Strava OAuth URL
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const redirectUri = `${appUrl}/api/strava/callback`;
  results.strava_oauth = {
    redirect_uri: redirectUri,
    client_id: process.env.STRAVA_CLIENT_ID || "❌ missing",
    auth_url: buildAuthUrl(redirectUri),
  };

  return NextResponse.json(results, { status: 200 });
}
