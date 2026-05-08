/**
 * GET /api/strava/activities?perPage=30&page=1
 * Returns a list of the authenticated athlete's activities.
 */
import { NextRequest, NextResponse } from "next/server";
import { getActivities } from "@/lib/strava";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const perPage = Number(searchParams.get("perPage") ?? 30);
    const page = Number(searchParams.get("page") ?? 1);
    const after = searchParams.get("after") ? Number(searchParams.get("after")) : undefined;
    const before = searchParams.get("before") ? Number(searchParams.get("before")) : undefined;

    const activities = await getActivities({ perPage, page, after, before });
    return NextResponse.json({ activities });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
