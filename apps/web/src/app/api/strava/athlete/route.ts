/**
 * GET /api/strava/athlete
 * Returns the authenticated athlete's profile and stats.
 */
import { NextResponse } from "next/server";
import { getAthlete, getAthleteStats } from "@/lib/strava";

export async function GET() {
  try {
    const athlete = await getAthlete();
    const stats = await getAthleteStats(athlete.id);
    return NextResponse.json({ athlete, stats });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
