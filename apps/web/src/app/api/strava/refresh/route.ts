/**
 * POST /api/strava/refresh
 * Manually triggers a token refresh. Useful to call on startup or before
 * a batch of API calls if you want to eagerly renew the token.
 */
import { NextResponse } from "next/server";
import { getValidAccessToken } from "@/lib/strava";

export async function POST() {
  try {
    const token = await getValidAccessToken();
    // Return only that a token exists — never expose the actual token to the client
    return NextResponse.json({ ok: true, tokenPresent: token.length > 0 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
