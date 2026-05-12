/**
 * Strava API v3 client
 *
 * Auth: OAuth 2.0 — tokens stored server-side in env vars.
 * Tokens are refreshed automatically when expired.
 *
 * Docs: https://developers.strava.com/docs/
 * Rate limits: 100 reads / 15 min, 1 000 reads / day
 */

const STRAVA_BASE = "https://www.strava.com/api/v3";
const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface StravaTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number; // Unix timestamp (seconds)
}

/** Token response from the authorization_code exchange (also includes athlete) */
export interface StravaTokenResponse extends StravaTokens {
  athlete?: StravaAthlete;
}

export interface StravaAthlete {
  id: number;
  firstname: string;
  lastname: string;
  profile: string; // avatar URL
  city: string;
  country: string;
  sex: string;
  premium: boolean;
  created_at: string;
  updated_at: string;
}

export interface StravaActivity {
  id: number;
  name: string;
  type: string; // "Run", "Ride", etc.
  sport_type: string;
  start_date: string;
  start_date_local: string;
  distance: number; // metres
  moving_time: number; // seconds
  elapsed_time: number; // seconds
  total_elevation_gain: number; // metres
  average_speed: number; // m/s
  max_speed: number; // m/s
  average_heartrate?: number;
  max_heartrate?: number;
  average_cadence?: number;
  suffer_score?: number;
  kudos_count: number;
  achievement_count: number;
  map?: { summary_polyline: string };
}

export interface StravaStats {
  recent_run_totals: { count: number; distance: number; moving_time: number; elevation_gain: number };
  all_run_totals: { count: number; distance: number; moving_time: number; elevation_gain: number };
  ytd_run_totals: { count: number; distance: number; moving_time: number; elevation_gain: number };
}

// ─── Token management ───────────────────────────────────────────────────────

/**
 * Returns a valid access token, refreshing if expired.
 * NOTE: In production with a DB, persist the new tokens back to storage.
 *       For now, tokens are read from env and refresh is ephemeral per request.
 */
export async function getValidAccessToken(): Promise<string> {
  const expiresAt = Number(process.env.STRAVA_TOKEN_EXPIRES_AT ?? 0);
  const now = Math.floor(Date.now() / 1000);

  // Refresh 60 seconds before actual expiry to avoid race conditions
  if (now < expiresAt - 60) {
    const token = process.env.STRAVA_ACCESS_TOKEN;
    if (!token) throw new Error("STRAVA_ACCESS_TOKEN is not set");
    return token;
  }

  return refreshAccessToken();
}

async function refreshAccessToken(): Promise<string> {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  const refreshToken = process.env.STRAVA_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Missing Strava OAuth credentials in environment");
  }

  const res = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Strava token refresh failed (${res.status}): ${text}`);
  }

  const tokens: StravaTokens = await res.json();

  // In a real app: persist tokens.access_token, tokens.refresh_token,
  // and tokens.expires_at to your database here.
  // For now we log so you can update .env.local manually if needed.
  console.log("[strava] Token refreshed. Update .env.local if needed:", {
    STRAVA_ACCESS_TOKEN: tokens.access_token,
    STRAVA_REFRESH_TOKEN: tokens.refresh_token,
    STRAVA_TOKEN_EXPIRES_AT: tokens.expires_at,
  });

  return tokens.access_token;
}

// ─── Per-user token management (multi-user / Supabase DB) ───────────────────

/**
 * Refresh using an explicit refresh token (for per-user DB-backed auth).
 * Returns full token set so caller can persist them.
 */
export async function refreshTokensForUser(refreshToken: string): Promise<StravaTokens> {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing STRAVA_CLIENT_ID or STRAVA_CLIENT_SECRET");
  }

  const res = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Strava token refresh failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<StravaTokens>;
}

/**
 * Returns a valid Strava access token for a specific user.
 * Reads their tokens from Supabase DB, refreshes if expired, and saves updated tokens back.
 */
export async function getValidAccessTokenForUser(userId: string): Promise<string> {
  // Lazy import to avoid circular deps at module level
  const { getUserStrava, upsertUserStrava } = await import("@/lib/db/user-strava");

  const record = await getUserStrava(userId);
  if (!record) {
    throw new Error("No Strava connection found. Please connect Strava first.");
  }

  const now = Math.floor(Date.now() / 1000);
  if (now < record.token_expires_at - 60) {
    return record.access_token;
  }

  // Token expired — refresh
  const newTokens = await refreshTokensForUser(record.refresh_token);
  await upsertUserStrava(userId, {
    access_token: newTokens.access_token,
    refresh_token: newTokens.refresh_token,
    token_expires_at: newTokens.expires_at,
  });

  return newTokens.access_token;
}

// ─── API helpers ────────────────────────────────────────────────────────────

async function stravaFetch<T>(path: string, params?: Record<string, string | number>): Promise<T> {
  const token = await getValidAccessToken();

  const url = new URL(`${STRAVA_BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    // Revalidate every 5 minutes in Next.js cache
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Strava API error ${res.status} on ${path}: ${text}`);
  }

  return res.json() as Promise<T>;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/** Fetch the authenticated athlete's profile */
export async function getAthlete(): Promise<StravaAthlete> {
  return stravaFetch<StravaAthlete>("/athlete");
}

/** Fetch the authenticated athlete's aggregate stats */
export async function getAthleteStats(athleteId: number): Promise<StravaStats> {
  return stravaFetch<StravaStats>(`/athletes/${athleteId}/stats`);
}

/**
 * Fetch recent activities (default: last 30, sorted newest first).
 * @param perPage   Max items per page (1-200)
 * @param page      Page number (1-indexed)
 * @param before    Unix timestamp — only activities before this date
 * @param after     Unix timestamp — only activities after this date
 */
export async function getActivities(opts?: {
  perPage?: number;
  page?: number;
  before?: number;
  after?: number;
}): Promise<StravaActivity[]> {
  const params: Record<string, number> = {
    per_page: opts?.perPage ?? 30,
    page: opts?.page ?? 1,
  };
  if (opts?.before) params.before = opts.before;
  if (opts?.after) params.after = opts.after;
  return stravaFetch<StravaActivity[]>("/athlete/activities", params);
}

/** Fetch ALL activities by paginating until Strava returns an empty page */
export async function getAllActivities(): Promise<StravaActivity[]> {
  const all: StravaActivity[] = [];
  let page = 1;
  const perPage = 200; // Strava max per page
  while (true) {
    const batch = await getActivities({ perPage, page });
    if (batch.length === 0) break;
    all.push(...batch);
    if (batch.length < perPage) break; // last page
    page++;
  }
  return all;
}

/** Fetch a single activity by ID */
export async function getActivity(id: number): Promise<StravaActivity> {
  return stravaFetch<StravaActivity>(`/activities/${id}`);
}

// ─── OAuth helper ───────────────────────────────────────────────────────────

/** Build the Strava authorization URL for the Connect with Strava button */
export function buildAuthUrl(redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID ?? "",
    redirect_uri: redirectUri,
    response_type: "code",
    approval_prompt: "force",
    scope: "read,activity:read_all",
  });
  return `https://www.strava.com/oauth/authorize?${params.toString()}`;
}

/** Exchange an authorization code for tokens (used in the OAuth callback) */
export async function exchangeCodeForTokens(code: string): Promise<StravaTokenResponse> {
  const res = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Strava code exchange failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<StravaTokenResponse>;
}

// ─── Per-user API helpers ────────────────────────────────────────────────────

/** Strava fetch using a pre-validated access token */
async function stravaFetchWithToken<T>(
  token: string,
  path: string,
  params?: Record<string, string | number>
): Promise<T> {
  const url = new URL(`${STRAVA_BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  }
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Strava API error ${res.status} on ${path}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export async function getAthleteForUser(userId: string): Promise<StravaAthlete> {
  const token = await getValidAccessTokenForUser(userId);
  return stravaFetchWithToken<StravaAthlete>(token, "/athlete");
}

export async function getAthleteStatsForUser(
  userId: string,
  athleteId: number
): Promise<StravaStats> {
  const token = await getValidAccessTokenForUser(userId);
  return stravaFetchWithToken<StravaStats>(token, `/athletes/${athleteId}/stats`);
}

export async function getAllActivitiesForUser(userId: string): Promise<StravaActivity[]> {
  const token = await getValidAccessTokenForUser(userId);
  const all: StravaActivity[] = [];
  let page = 1;
  const perPage = 200;
  while (true) {
    const batch = await stravaFetchWithToken<StravaActivity[]>(token, "/athlete/activities", {
      per_page: perPage,
      page,
    });
    if (batch.length === 0) break;
    all.push(...batch);
    if (batch.length < perPage) break;
    page++;
  }
  return all;
}

export async function getActivityForUser(userId: string, activityId: number): Promise<StravaActivity> {
  const token = await getValidAccessTokenForUser(userId);
  return stravaFetchWithToken<StravaActivity>(token, `/activities/${activityId}`);
}
