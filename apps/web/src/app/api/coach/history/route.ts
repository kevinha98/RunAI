/**
 * GET  /api/coach/history — returns saved conversation + memories
 * POST /api/coach/history — saves conversation + fires memory extraction
 * DELETE /api/coach/history — clears all memories + conversation
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnyStravaUserId } from "@/lib/db/user-strava";
import {
  getCoachConversation,
  saveCoachConversation,
  clearCoachConversation,
  getCoachMemories,
  clearAllCoachMemories,
  extractAndSaveMemories,
  type ConversationMessage,
} from "@/lib/db/coach-memory";

export const dynamic = "force-dynamic";

async function resolveUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) return user.id;
  return getAnyStravaUserId();
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const userId = await resolveUserId();
    if (!userId) return NextResponse.json({ messages: [], memories: [] });

    const [messages, memories] = await Promise.all([
      getCoachConversation(userId),
      getCoachMemories(userId),
    ]);

    return NextResponse.json({ messages, memories });
  } catch (err) {
    console.error("[api/coach/history GET]", err);
    return NextResponse.json({ messages: [], memories: [] });
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const userId = await resolveUserId();
    if (!userId) return NextResponse.json({ ok: false }, { status: 401 });

    const body = await req.json();
    const messages: ConversationMessage[] = body.messages ?? [];

    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid messages" }, { status: 400 });
    }

    // Save conversation
    await saveCoachConversation(userId, messages);

    // Fire-and-forget memory extraction from last user message
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (lastUser?.content?.trim()) {
      extractAndSaveMemories(userId, lastUser.content).catch(() => {});
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/coach/history POST]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function DELETE() {
  try {
    const userId = await resolveUserId();
    if (!userId) return NextResponse.json({ ok: false }, { status: 401 });

    await Promise.all([
      clearCoachConversation(userId),
      clearAllCoachMemories(userId),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/coach/history DELETE]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
