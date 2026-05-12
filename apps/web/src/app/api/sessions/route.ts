/**
 * GET /api/sessions?week=N   — fetch sessions for a given plan week
 * PUT /api/sessions           — save sessions for a given plan week
 *
 * Falls back to plan-data.ts baseline when no DB row exists for a week.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnyStravaUserId } from "@/lib/db/user-strava";
import {
  getWeekSessions,
  saveWeekSessions,
  type SessionEntry,
  type WeekSource,
} from "@/lib/db/weekly-sessions";
import { WEEKS, SESSION_ICONS } from "@/lib/plan-data";

export const dynamic = "force-dynamic";

async function resolveUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) return user.id;
  return getAnyStravaUserId();
}

function planToSessions(weekNumber: number): SessionEntry[] {
  const weekData = WEEKS.find((w) => w.week === weekNumber) ?? WEEKS[0];
  return weekData.sessions.map((s, i) => ({
    id: `w${weekNumber}-${i}`,
    day: s.day,
    type: s.type,
    distance: s.distance,
    pace: s.pace,
    icon: SESSION_ICONS[s.type] ?? "🏃",
    completed: false,
    completedDay: null,
    comment: "",
  }));
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const weekParam = req.nextUrl.searchParams.get("week");
  const weekNumber = weekParam ? parseInt(weekParam, 10) : 1;

  if (isNaN(weekNumber) || weekNumber < 1 || weekNumber > 52) {
    return NextResponse.json({ error: "Invalid week" }, { status: 400 });
  }

  try {
    const userId = await resolveUserId();
    if (!userId) {
      // Not authenticated — return plan baseline, no persistence
      return NextResponse.json({
        weekNumber,
        sessions: planToSessions(weekNumber),
        source: "plan",
      });
    }

    const row = await getWeekSessions(userId, weekNumber);
    if (row) {
      return NextResponse.json({
        weekNumber,
        sessions: row.sessions,
        source: row.source,
        updatedAt: row.updatedAt,
      });
    }

    // No DB row — return plan baseline
    return NextResponse.json({
      weekNumber,
      sessions: planToSessions(weekNumber),
      source: "plan",
    });
  } catch (err) {
    console.error("[api/sessions GET] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ─── PUT ──────────────────────────────────────────────────────────────────────

export async function PUT(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      week: number;
      sessions: SessionEntry[];
      source?: WeekSource;
    };

    const { week, sessions, source = "manual" } = body;

    if (!week || !Array.isArray(sessions)) {
      return NextResponse.json({ error: "Missing week or sessions" }, { status: 400 });
    }

    const userId = await resolveUserId();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const saved = await saveWeekSessions(userId, week, sessions, source);
    if (!saved) {
      return NextResponse.json({ error: "Failed to save" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, updatedAt: saved.updatedAt });
  } catch (err) {
    console.error("[api/sessions PUT] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
