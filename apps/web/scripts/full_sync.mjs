/**
 * Standalone full historical sync — bypasses Next.js server entirely.
 * Reads .env.local, paginates all Strava activities, writes strava-stats.json.
 * Run: node scripts/full_sync.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

// ── Load .env.local ───────────────────────────────────────────────────────────
const envFile = path.join(ROOT, ".env.local");
for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx === -1) continue;
  const key = trimmed.slice(0, idx).trim();
  const val = trimmed.slice(idx + 1).trim();
  process.env[key] = val;
}

const CLIENT_ID     = process.env.STRAVA_CLIENT_ID;
const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
let   ACCESS_TOKEN  = process.env.STRAVA_ACCESS_TOKEN;
const REFRESH_TOKEN = process.env.STRAVA_REFRESH_TOKEN;
let   EXPIRES_AT    = parseInt(process.env.STRAVA_TOKEN_EXPIRES_AT ?? "0", 10);

// ── Token refresh ─────────────────────────────────────────────────────────────
async function ensureToken() {
  if (Date.now() / 1000 < EXPIRES_AT - 60) return; // still valid
  console.log("Refreshing token...");
  const r = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  const j = await r.json();
  ACCESS_TOKEN = j.access_token;
  EXPIRES_AT   = j.expires_at ?? Math.floor(Date.now() / 1000) + 21600;
  console.log("Token refreshed, expires:", new Date(EXPIRES_AT * 1000).toISOString());
}

// ── Strava fetch ──────────────────────────────────────────────────────────────
async function stravaGet(path, params = {}) {
  await ensureToken();
  const url = new URL(`https://www.strava.com/api/v3${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const r = await fetch(url, { headers: { Authorization: `Bearer ${ACCESS_TOKEN}` } });
  if (!r.ok) throw new Error(`Strava ${r.status}: ${await r.text()}`);
  return r.json();
}

// ── Paginate all activities ───────────────────────────────────────────────────
async function getAllActivities() {
  const all = [];
  let page = 1;
  while (true) {
    console.log(`  Fetching page ${page}...`);
    const batch = await stravaGet("/athlete/activities", { per_page: 200, page });
    if (!batch.length) break;
    all.push(...batch);
    console.log(`  → ${batch.length} activities (total so far: ${all.length})`);
    if (batch.length < 200) break;
    page++;
  }
  return all;
}

// ── Compute metrics ───────────────────────────────────────────────────────────
function computeMetrics(runs, stravaStats) {
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  const weekRuns = runs.filter(r => new Date(r.start_date).getTime() > oneWeekAgo);
  const weeklyKm = weekRuns.reduce((s, r) => s + r.distance / 1000, 0);
  const weeklyRuns = weekRuns.length;

  const totalTime = weekRuns.reduce((s, r) => s + r.moving_time, 0);
  const totalDist = weekRuns.reduce((s, r) => s + r.distance, 0);
  const avgPaceSecPerKm = totalDist > 0 ? totalTime / (totalDist / 1000) : 0;

  const last30 = runs.filter(r => new Date(r.start_date).getTime() > thirtyDaysAgo);
  const longestRunKm = last30.reduce((m, r) => Math.max(m, r.distance / 1000), 0);

  const ytd = stravaStats?.ytd_run_totals ?? {};
  const allTime = stravaStats?.all_run_totals ?? {};

  return {
    weeklyKm: Math.round(weeklyKm * 10) / 10,
    weeklyRuns,
    avgPaceSecPerKm: Math.round(avgPaceSecPerKm),
    longestRunKm: Math.round(longestRunKm * 10) / 10,
    totalRunsAllTime: allTime.count ?? 0,
    totalKmAllTime: Math.round((allTime.distance ?? 0) / 100) / 10,
    ytdKm: Math.round((ytd.distance ?? 0) / 100) / 10,
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("=== RunAI Full Historical Sync ===\n");

  console.log("Fetching athlete profile...");
  const athlete = await stravaGet("/athlete");
  console.log(`Athlete: ${athlete.firstname} ${athlete.lastname}\n`);

  console.log("Fetching athlete stats...");
  const stravaStats = await stravaGet(`/athletes/${athlete.id}/stats`);
  console.log(`All-time runs: ${stravaStats.all_run_totals.count}, YTD: ${stravaStats.ytd_run_totals.count}\n`);

  console.log("Fetching all activities (paginated)...");
  const activities = await getAllActivities();
  console.log(`\nTotal activities fetched: ${activities.length}`);

  const runs = activities.filter(a => a.type === "Run" || a.sport_type === "Run");
  console.log(`Runs: ${runs.length}`);

  const computed = computeMetrics(runs, stravaStats);
  console.log(`\nComputed metrics:`, computed);

  const stats = {
    lastSync: new Date().toISOString(),
    athlete,
    stravaStats,
    recentActivities: activities,
    recentRuns: runs.slice(0, 20),
    computed,
  };

  const outPath = path.join(ROOT, "data", "strava-stats.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(stats, null, 2));
  console.log(`\n✓ Saved ${activities.length} activities to ${outPath}`);

  // Re-export Excel
  console.log("\nRe-exporting Excel...");
  const { execSync } = await import("child_process");
  try {
    execSync(`python "${path.join(ROOT, "scripts", "export_to_excel.py")}"`, { stdio: "inherit" });
  } catch {
    console.log("(Python/Excel export skipped — run manually if needed)");
  }
}

main().catch(e => { console.error(e); process.exit(1); });
