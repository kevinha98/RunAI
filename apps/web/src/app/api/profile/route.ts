/**
 * GET  /api/profile        — fetch athlete profile for authenticated user
 * PATCH /api/profile       — save Hilde's manual edit (user_content)
 * DELETE /api/profile/user — clear user override (revert to LLM version)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnyStravaUserId } from "@/lib/db/user-strava";
import {
  getAthleteProfile,
  saveUserEdit,
  clearUserEdit,
} from "@/lib/db/athlete-profile";

export const dynamic = "force-dynamic";

async function resolveUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return user.id;
  return getAnyStravaUserId();
}

export async function GET() {
  try {
    const userId = await resolveUserId();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const profile = await getAthleteProfile(userId);
    if (!profile) {
      return NextResponse.json({
        llmContent: "",
        userContent: null,
        generatedAt: null,
        activeContent: "",
      });
    }

    return NextResponse.json({
      llmContent: profile.llmContent,
      userContent: profile.userContent,
      generatedAt: profile.generatedAt,
      activeContent: profile.activeContent,
    });
  } catch (err) {
    console.error("[api/profile GET]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = await resolveUserId();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body = await req.json();
    const userContent: string = (body.userContent ?? "").trim();

    if (userContent === "") {
      // Empty edit = clear override
      await clearUserEdit(userId);
    } else {
      await saveUserEdit(userId, userContent);
    }

    const updated = await getAthleteProfile(userId);
    return NextResponse.json({
      llmContent: updated?.llmContent ?? "",
      userContent: updated?.userContent ?? null,
      generatedAt: updated?.generatedAt ?? null,
      activeContent: updated?.activeContent ?? "",
    });
  } catch (err) {
    console.error("[api/profile PATCH]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
