import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deleteCheckin } from "@/lib/db/checkins";
import { getAnyStravaUserId } from "@/lib/db/user-strava";

async function resolveUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return user.id;
  return getAnyStravaUserId();
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await resolveUserId();
  if (!userId) {
    return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
  }

  const { id } = await params;
  const ok = await deleteCheckin(userId, id);
  if (!ok) {
    return NextResponse.json({ error: "Kunne ikke slette" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
