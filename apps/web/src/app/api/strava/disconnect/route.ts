/**
 * POST /api/strava/disconnect
 *
 * Clears Strava tokens and athlete data for the current user.
 * Does NOT revoke the Strava token on Strava's side (requires deauth endpoint
 * which needs the access token to still be valid).
 */

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = createServiceClient();
  const { error } = await service
    .from("user_strava")
    .update({
      access_token: "",
      refresh_token: "",
      token_expires_at: 0,
      strava_athlete_id: null,
      athlete: null,
      strava_stats: null,
      recent_runs: [],
      recent_activities: [],
      computed: null,
      last_sync: null,
    })
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: "Database update failed" }, { status: 500 });
  }

  revalidatePath("/dashboard");
  return NextResponse.json({ ok: true });
}
