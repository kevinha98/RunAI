/**
 * POST /api/profile/refresh
 *
 * Thin route wrapper around lib/refresh-profile.ts.
 * The core logic lives in the lib so it can be imported
 * from other routes without pulling in route segment configs.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnyStravaUserId } from "@/lib/db/user-strava";
import { refreshAthleteProfile } from "@/lib/refresh-profile";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// NOTE: Do NOT re-export non-HTTP-handler functions from route files —
// Next.js only allows GET/POST/etc. as named exports here.
// Import refreshAthleteProfile directly from "@/lib/refresh-profile" instead.

async function resolveUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) return user.id;
  return getAnyStravaUserId();
}

export async function POST(req: NextRequest) {
  try {
    const userId = await resolveUserId();
    if (!userId)
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const fiveKSeconds: number | undefined =
      typeof body.fiveKSeconds === "number" && body.fiveKSeconds > 0
        ? body.fiveKSeconds
        : undefined;

    await refreshAthleteProfile(userId, fiveKSeconds);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/profile/refresh POST]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
