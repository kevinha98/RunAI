"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  Brain,
  MessageCircle,
  ChevronRight,
  Play,
  Activity,
  TrendingUp,
  TrendingDown,
  Heart,
  Mountain,
  Zap,
  Timer,
  BarChart2,
} from "lucide-react";
import type { StoredStats, StravaActivity } from "@/lib/strava-types";
import { formatPace } from "@/lib/strava-types";
import { getCurrentWeek, WEEKS } from "@/lib/plan-data";

const STRAVA_ORANGE = "#FC5200";
const RACE_DATE = "2027-04-24";

// Map Norwegian day abbreviations to JS getDay() index (0=Sun)
const DAY_IDX: Record<string, number> = {
  Man: 1, Tir: 2, Ons: 3, Tor: 4, Fre: 5, Lør: 6, Søn: 0,
};

function getPlanSessions() {
  const weekData = WEEKS.find((w) => w.week === getCurrentWeek()) ?? WEEKS[0];
  return weekData.sessions.map((s) => ({ ...s, dayIdx: DAY_IDX[s.day] ?? 0 }));
}
// Helpers

function metersToKm(m: number) { return (m / 1000).toFixed(1); }
function mpsToKmh(mps: number) { return (mps * 3.6).toFixed(1); }
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("nb-NO", { day: "numeric", month: "short" });
}
function formatMovingTime(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}t ${m}m`;
  return `${m}m`;
}
function activityPace(a: { distance: number; moving_time: number }) {
  if (!a.distance || !a.moving_time) return "—";
  return formatPace(a.moving_time / (a.distance / 1000));
}
function activityPaceSec(a: { distance: number; moving_time: number }) {
  if (!a.distance || !a.moving_time) return 0;
  return a.moving_time / (a.distance / 1000);
}

function weeklyKmBuckets(runs: StravaActivity[], n = 8): { label: string; km: number }[] {
  const map: Record<string, number> = {};
  for (const r of runs) {
    const d = new Date(r.start_date_local);
    const jan1 = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
    const key = `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
    map[key] = (map[key] ?? 0) + r.distance / 1000;
  }
  const sorted = Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-n);
  return sorted.map(([key, km]) => ({ label: key.split("-W")[1] ?? key, km: Math.round(km * 10) / 10 }));
}

// Charts

function BarChart({ data, color = STRAVA_ORANGE }: {
  data: { label: string; value: number }[];
  color?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const W = 320; const H = 80;
  const BAR_W = Math.floor((W - (data.length - 1) * 4) / data.length);
  return (
    <svg viewBox={`0 0 ${W} ${H + 20}`} className="w-full" style={{ overflow: "visible" }}>
      {data.map((d, i) => {
        const barH = Math.max(3, (d.value / max) * H);
        const x = i * (BAR_W + 4);
        const isLast = i === data.length - 1;
        return (
          <g key={i}>
            <rect x={x} y={H - barH} width={BAR_W} height={barH} rx={3}
              fill={isLast ? color : `${color}55`} />
            <text x={x + BAR_W / 2} y={H + 14} textAnchor="middle" fontSize={9} fill="#6B6B65">
              {d.label}
            </text>
            {isLast && (
              <text x={x + BAR_W / 2} y={H - barH - 4} textAnchor="middle" fontSize={9} fontWeight="bold" fill={color}>
                {d.value}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function PaceTrendChart({ runs }: { runs: StravaActivity[] }) {
  const last10 = runs.slice(0, 10).reverse().filter((r) => r.distance > 0 && r.moving_time > 0);
  if (last10.length < 2) return <p className="text-xs text-[#6B6B65]">Trenger minst 2 løp</p>;

  const paces = last10.map((r) => activityPaceSec(r));
  const maxP = Math.max(...paces);
  const range = maxP - Math.min(...paces) || 60;
  const W = 280; const H = 60;

  const pts = paces.map((p, i) => ({
    x: (i / (paces.length - 1)) * W,
    y: H - ((maxP - p) / range) * H,
  }));

  const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaD = `${pathD} L${W},${H} L0,${H} Z`;
  const trend = paces[paces.length - 1] - paces[0];

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        {trend < -5
          ? <TrendingDown size={13} className="text-emerald-500" />
          : trend > 5
          ? <TrendingUp size={13} className="text-red-400" />
          : <Activity size={13} className="text-[#6B6B65]" />}
        <span className="text-xs text-[#6B6B65]">
          {trend < -5 ? "Farten forbedres" : trend > 5 ? "Farten synker" : "Stabil fart"} · siste {last10.length} løp
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H + 24}`} className="w-full" style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id="paceGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={STRAVA_ORANGE} stopOpacity="0.18" />
            <stop offset="100%" stopColor={STRAVA_ORANGE} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#paceGrad)" />
        <path d={pathD} stroke={STRAVA_ORANGE} strokeWidth="2" fill="none" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={3} fill="white" stroke={STRAVA_ORANGE} strokeWidth={1.5} />
            <text x={p.x} y={H + 16} textAnchor="middle" fontSize={8} fill="#6B6B65">
              {formatDate(last10[i].start_date_local).split(" ")[0]}
            </text>
          </g>
        ))}
        <text x={0} y={pts[0].y - 5} textAnchor="start" fontSize={8} fontWeight="bold" fill={STRAVA_ORANGE}>
          {formatPace(paces[0])}
        </text>
        <text x={W} y={pts[pts.length - 1].y - 5} textAnchor="end" fontSize={8} fontWeight="bold" fill={STRAVA_ORANGE}>
          {formatPace(paces[paces.length - 1])}
        </text>
      </svg>
    </div>
  );
}

// Sub-components

function StatCard({ icon, label, value, unit, sub, subColor = "text-[#6B6B65]" }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit: string;
  sub: string;
  subColor?: string;
}) {
  return (
    <div className="bg-white border border-[#E5E5E2] rounded-2xl p-4 hover:border-[#C8C8C4] transition-colors">
      <div className="flex items-center gap-1.5 text-xs text-[#6B6B65] mb-2 font-medium">
        {icon}
        {label}
      </div>
      <div className="flex items-end gap-1 mb-1">
        <span className="text-xl font-black tracking-tight leading-none">{value}</span>
        {unit && <span className="text-xs text-[#6B6B65] mb-0.5">{unit}</span>}
      </div>
      <div className={`text-xs font-medium truncate ${subColor}`}>{sub}</div>
    </div>
  );
}

function StravaIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill={STRAVA_ORANGE}>
      <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
    </svg>
  );
}

// Main component

interface Props { stravaData: StoredStats; stravaStatus?: string | null; }

export default function DashboardClient({ stravaData, stravaStatus }: Props) {
  const [isSyncing, setIsSyncing] = useState(false);
  const handleSync = useCallback(async () => {
    setIsSyncing(true);
    try { await fetch("/api/strava/sync", { method: "POST" }); } finally { setIsSyncing(false); }
  }, []);

  const minutesSinceSync = stravaData.lastSync
    ? Math.round((Date.now() - new Date(stravaData.lastSync).getTime()) / 60000)
    : null;

  const todayIdx = new Date().getDay();
  const thisWeek = getPlanSessions().map((d) => ({
    ...d,
    today: d.dayIdx === todayIdx,
    done: todayIdx === 0 ? d.dayIdx !== 0 : d.dayIdx > 0 && d.dayIdx < todayIdx,
  }));
  const today = thisWeek.find((d) => d.today);
  const daysUntilRace = Math.ceil((new Date(RACE_DATE).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  const { computed, athlete, recentRuns, stravaStats } = stravaData;
  const hasData = athlete !== null;
  const athleteName = athlete?.firstname ?? null;

  const runsWithPace = recentRuns.filter((r) => r.distance > 0 && r.moving_time > 0);

  const bestPace = runsWithPace.length > 0
    ? Math.min(...runsWithPace.map((r) => activityPaceSec(r)))
    : 0;

  const runsWithHR = runsWithPace.filter((r) => r.average_heartrate);
  const avgHR = runsWithHR.length > 0
    ? Math.round(runsWithHR.reduce((s, r) => s + (r.average_heartrate ?? 0), 0) / runsWithHR.length)
    : null;

  const now = new Date();
  const totalElevationMonth = recentRuns
    .filter((r) => {
      const d = new Date(r.start_date_local);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((s, r) => s + (r.total_elevation_gain ?? 0), 0);

  const avgSpeedKmh = runsWithPace.length > 0
    ? runsWithPace.reduce((s, r) => s + (r.average_speed ?? 0), 0) / runsWithPace.length * 3.6
    : 0;

  const weeklyBuckets = weeklyKmBuckets(recentRuns, 8);
  const recentRunCount = stravaStats?.recent_run_totals?.count ?? 0;
  const ytdElevation = Math.round(
    ((stravaStats?.ytd_run_totals as { elevation_gain?: number } | null)?.elevation_gain) ?? 0
  );

  const avgRunDistKm = runsWithPace.length > 0
    ? runsWithPace.reduce((s, r) => s + r.distance / 1000, 0) / runsWithPace.length
    : 0;

  const last5 = runsWithPace.slice(0, 5);
  const prev5 = runsWithPace.slice(5, 10);
  const last5Pace = last5.length ? last5.reduce((s, r) => s + activityPaceSec(r), 0) / last5.length : 0;
  const prev5Pace = prev5.length ? prev5.reduce((s, r) => s + activityPaceSec(r), 0) / prev5.length : 0;
  const paceDelta = prev5Pace > 0 ? prev5Pace - last5Pace : 0;

  return (
    <div className="flex-1 md:ml-60 p-4 md:p-8 pb-24 md:pb-8 min-w-0">
      {/* Strava feilvarsel */}
      {stravaStatus && ["token_expired", "fetch_error", "error"].includes(stravaStatus) && (
        <div className="mb-4 flex items-center justify-between bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 text-sm">
          <span className="text-orange-800">Strava-tilkoblingen er utløpt eller har feil. Data kan være utdatert.</span>
          <Link href="/api/strava/connect" className="ml-4 text-[#FC5200] font-semibold hover:underline whitespace-nowrap">Koble til på nytt</Link>
        </div>
      )}
      {/* Mobile top bar */}
      <div className="flex md:hidden items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#FC5200] rounded-lg flex items-center justify-center">
            <span className="text-white font-black text-xs">R</span>
          </div>
          <span className="font-bold text-[#111110]">RunAI</span>
        </div>
        <Link href="/dashboard/coach" className="flex items-center gap-2 bg-white border border-[#E5E5E2] px-3 py-2 rounded-xl text-sm">
          <MessageCircle size={14} className="text-[#FC5200]" />
          Trener
        </Link>
      </div>

      {/* Desktop header */}
      <div className="hidden md:flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black tracking-tight">
            {athleteName ? `God dag, ${athleteName} 👋` : "God dag 👋"}
          </h1>
          {/* Marathon progress indicator */}
          {(() => {
            const planStart = new Date(2026, 4, 5).getTime();
            const raceEnd = new Date(2027, 3, 24).getTime();
            const now2 = Date.now();
            const pct = Math.min(100, Math.max(0, ((now2 - planStart) / (raceEnd - planStart)) * 100));
            const phase = WEEKS.find((w) => w.week === getCurrentWeek())?.phase ?? "Grunntrening";
            return (
              <div className="mt-1.5">
                <p className="text-[#6B6B65] text-sm">{daysUntilRace} dager igjen · <span className="font-medium text-[#111110]">{phase}</span> · Bergen City Marathon</p>
                <div className="mt-1 h-1.5 w-48 bg-[#F0F0EE] rounded-full overflow-hidden">
                  <div className="h-full bg-[#FC5200] rounded-full transition-all" style={{ width: `${pct.toFixed(1)}%` }} />
                </div>
              </div>
            );
          })()}
        </div>
        <Link
          href="/dashboard/coach"
          className="flex items-center gap-2 bg-white border border-[#E5E5E2] hover:border-[rgba(252,82,0,0.40)] px-4 py-2.5 rounded-xl text-sm transition-colors"
        >
          <MessageCircle size={14} className="text-[#FC5200]" />
          Spør treneren din
        </Link>
      </div>

      {/* Today's workout banner */}
      {today && today.type !== "Hvile" && (
        <div className="bg-gradient-to-br from-[rgba(252,82,0,0.10)] to-[rgba(252,82,0,0.04)] border border-[rgba(252,82,0,0.20)] rounded-2xl p-5 mb-6 flex items-center justify-between">
          <div>
            <div className="text-xs text-[#FC5200] font-bold uppercase tracking-widest mb-1">I dag</div>
            <h2 className="text-lg font-black tracking-tight">{today.type}</h2>
            <p className="text-[#6B6B65] text-sm">{today.distance} · Målfart {today.pace}</p>
          </div>
          <Link href="/dashboard/plan" className="flex items-center gap-2 bg-[#FC5200] text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-[#E04800] transition-colors shrink-0">
            <Play size={14} /> Vis økt
          </Link>
        </div>
      )}

      {/* Analytics */}
      {hasData ? (
        <>
          {/* Row 1: Pace & speed */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <StatCard
              icon={<Timer size={14} className="text-[#FC5200]" />}
              label="Snittfart"
              value={formatPace(computed.avgPaceSecPerKm)}
              unit="/km"
              sub={paceDelta !== 0
                ? paceDelta > 0
                  ? `▲ ${Math.round(Math.abs(paceDelta))}s raskere`
                  : `▼ ${Math.round(Math.abs(paceDelta))}s tregere`
                : "Siste 5 løp"}
              subColor={paceDelta > 0 ? "text-emerald-500" : paceDelta < 0 ? "text-red-400" : "text-[#6B6B65]"}
            />
            <StatCard
              icon={<Zap size={14} className="text-amber-500" />}
              label="Beste fart"
              value={formatPace(bestPace)}
              unit="/km"
              sub="Raskeste i loggen"
            />
            <StatCard
              icon={<TrendingUp size={14} className="text-blue-500" />}
              label="Snitt km/t"
              value={avgSpeedKmh > 0 ? avgSpeedKmh.toFixed(1) : "—"}
              unit="km/t"
              sub="Gjennomsnitt alle løp"
            />
            <StatCard
              icon={<Heart size={14} className="text-red-400" />}
              label="Snitt puls"
              value={avgHR ? String(avgHR) : "—"}
              unit="bpm"
              sub={avgHR ? "Gjennomsnitt siste løp" : "Ingen HR-data"}
            />
          </div>

          {/* Row 2: Volume */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <StatCard
              icon={<BarChart2 size={14} className="text-[#FC5200]" />}
              label="Denne uken"
              value={computed.weeklyKm.toFixed(1)}
              unit="km"
              sub={`${computed.weeklyRuns} økt${computed.weeklyRuns !== 1 ? "er" : ""}`}
            />
            <StatCard
              icon={<Activity size={14} className="text-[#FC5200]" />}
              label="Hittil i år"
              value={computed.ytdKm.toFixed(0)}
              unit="km"
              sub={recentRunCount > 0 ? `${recentRunCount} løp (4 uker)` : `${computed.totalRunsAllTime} løp totalt`}
            />
            <StatCard
              icon={<TrendingUp size={14} className="text-[#FC5200]" />}
              label="Lengste (30d)"
              value={computed.longestRunKm.toFixed(1)}
              unit="km"
              sub="Siste 30 dager"
            />
            <StatCard
              icon={<Activity size={14} className="text-purple-500" />}
              label="Snitt per løp"
              value={avgRunDistKm > 0 ? avgRunDistKm.toFixed(1) : "—"}
              unit="km"
              sub="Gjennomsnittlig distanse"
            />
          </div>

          {/* Row 3: Elevation & totals */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <StatCard
              icon={<Mountain size={14} className="text-emerald-600" />}
              label="Høydemeter (mnd)"
              value={totalElevationMonth > 0 ? String(Math.round(totalElevationMonth)) : "—"}
              unit="m"
              sub="Denne måneden"
            />
            <StatCard
              icon={<Mountain size={14} className="text-emerald-500" />}
              label="Høydemeter (år)"
              value={ytdElevation > 0 ? String(ytdElevation) : "—"}
              unit="m"
              sub="Hittil i år"
            />
            <StatCard
              icon={<Activity size={14} className="text-[#FC5200]" />}
              label="Totalt km"
              value={computed.totalKmAllTime > 0 ? computed.totalKmAllTime.toFixed(0) : "—"}
              unit="km"
              sub="Alle tider"
            />
            <StatCard
              icon={<BarChart2 size={14} className="text-[#FC5200]" />}
              label="Totalt løp"
              value={computed.totalRunsAllTime ? String(computed.totalRunsAllTime) : "—"}
              unit=""
              sub="Alle tider"
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
            <div className="bg-white border border-[#E5E5E2] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm">Ukentlig volum</h3>
                <span className="text-xs text-[#6B6B65]">Siste 8 uker · km</span>
              </div>
              {weeklyBuckets.length >= 2 ? (
                <BarChart data={weeklyBuckets.map((b) => ({ label: `U${b.label}`, value: b.km }))} />
              ) : (
                <p className="text-xs text-[#6B6B65]">Trenger flere ukers data</p>
              )}
            </div>

            <div className="bg-white border border-[#E5E5E2] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm">Fartsutvikling</h3>
                <span className="text-xs text-[#6B6B65]">Siste 10 løp</span>
              </div>
              <PaceTrendChart runs={recentRuns} />
            </div>
          </div>

          {/* Run table */}
          {recentRuns.length > 0 && (
            <div className="bg-white border border-[#E5E5E2] rounded-2xl p-5 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <StravaIcon />
                  <h3 className="font-bold text-sm">Siste løp</h3>
                  {minutesSinceSync !== null && (
                    <span className="text-[10px] text-[#6B6B65]">· oppdatert {minutesSinceSync < 60 ? `${minutesSinceSync} min` : `${Math.floor(minutesSinceSync / 60)}t`} siden</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSync}
                    disabled={isSyncing}
                    className="text-xs text-[#FC5200] font-semibold hover:underline disabled:opacity-40"
                  >
                    {isSyncing ? "Oppdaterer…" : "Synk"}
                  </button>
                  <Link href="/dashboard/progress" className="text-xs text-[#FC5200] flex items-center gap-1 hover:underline font-semibold">
                    Se fremgang <ChevronRight size={12} />
                  </Link>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[#6B6B65] border-b border-[#F0F0EE]">
                      <th className="text-left pb-2 font-semibold pr-3">Dato</th>
                      <th className="text-left pb-2 font-semibold pr-3">Navn</th>
                      <th className="text-right pb-2 font-semibold pr-3">Dist</th>
                      <th className="text-right pb-2 font-semibold pr-3">Fart</th>
                      <th className="text-right pb-2 font-semibold pr-3">Tid</th>
                      <th className="text-right pb-2 font-semibold pr-3">Høyde</th>
                      <th className="text-right pb-2 font-semibold pr-3">Puls</th>
                      <th className="text-right pb-2 font-semibold">km/t</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentRuns.slice(0, 10).map((run, i) => (
                      <tr
                        key={run.id}
                        className={`border-b border-[#F8F8F6] hover:bg-[#FAFAF8] transition-colors ${i === 0 ? "font-semibold" : ""}`}
                      >
                        <td className="py-2.5 pr-3 text-[#6B6B65] whitespace-nowrap">{formatDate(run.start_date_local)}</td>
                        <td className="py-2.5 pr-3 max-w-[120px] truncate">{run.name}</td>
                        <td className="py-2.5 pr-3 text-right whitespace-nowrap">{metersToKm(run.distance)} km</td>
                        <td className="py-2.5 pr-3 text-right font-mono whitespace-nowrap text-[#FC5200]">{activityPace(run)}/km</td>
                        <td className="py-2.5 pr-3 text-right whitespace-nowrap">{formatMovingTime(run.moving_time)}</td>
                        <td className="py-2.5 pr-3 text-right whitespace-nowrap text-emerald-600">
                          {run.total_elevation_gain ? `${Math.round(run.total_elevation_gain)}m` : "—"}
                        </td>
                        <td className="py-2.5 pr-3 text-right whitespace-nowrap text-red-400">
                          {run.average_heartrate ? `♥ ${Math.round(run.average_heartrate)}` : "—"}
                        </td>
                        <td className="py-2.5 text-right whitespace-nowrap text-blue-500">
                          {run.average_speed ? mpsToKmh(run.average_speed) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white border border-[#E5E5E2] rounded-2xl p-8 mb-6 text-center">
          <div className="flex justify-center mb-3"><StravaIcon /></div>
          <h3 className="font-bold mb-2">Koble Strava for analyser</h3>
          <p className="text-sm text-[#6B6B65] mb-5 max-w-sm mx-auto">
            Koble til Strava for å se fart, puls, høydemeter, ukentlig volum og løpstrender.
          </p>
          <a href="/api/strava/connect" className="inline-flex items-center gap-2 bg-[#FC5200] text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-[#E04800] transition-colors">
            Koble til Strava
          </a>
        </div>
      )}

      {/* Bottom: Plan + Coach */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {/* Weekly plan */}
        <div className="md:col-span-2 bg-white border border-[#E5E5E2] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm">Denne uken</h3>
            <Link href="/dashboard/plan" className="text-xs text-[#FC5200] flex items-center gap-1 hover:underline font-semibold">
              Full plan <ChevronRight size={12} />
            </Link>
          </div>
          <div className="space-y-1">
            {thisWeek.map((d) => (
              <div
                key={d.day}
                className={`flex items-center gap-4 p-2.5 rounded-xl transition-colors ${
                  d.today ? "bg-[rgba(252,82,0,0.07)] border border-[rgba(252,82,0,0.18)]" : "hover:bg-[#F2F2F0]"
                }`}
              >
                <span className="text-xs font-bold text-[#6B6B65] w-7">{d.day}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${d.done ? "text-[#C8C8C4] line-through" : "text-[#111110]"}`}>
                      {d.type}
                    </span>
                    {d.today && (
                      <span className="text-xs bg-[rgba(252,82,0,0.12)] text-[#FC5200] px-2 py-0.5 rounded-full font-bold">
                        I dag
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-[#6B6B65]">{d.distance} · {d.pace}</span>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${d.done ? "bg-[#FC5200] border-[#FC5200]" : "border-[#C8C8C4]"}`}>
                  {d.done && <span className="text-white text-xs">✓</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Coach */}
        <div className="bg-white border border-[#E5E5E2] rounded-2xl p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-[rgba(252,82,0,0.10)] rounded-xl flex items-center justify-center">
              <Brain size={16} className="text-[#FC5200]" />
            </div>
            <div>
              <h3 className="font-bold text-sm">AI-trener</h3>
              <span className="text-xs text-[#FC5200] font-semibold">● Online</span>
            </div>
          </div>
          <div className="flex-1 space-y-2.5 mb-4">
            <div className="bg-[#F2F2F0] rounded-xl p-3 text-xs text-[#6B6B65] leading-relaxed">
              &ldquo;Jeg analyserer treningsdataene dine og tilpasser planen løpende.&rdquo;
            </div>
            <div className="bg-[#F2F2F0] rounded-xl p-3 text-xs text-[#6B6B65] leading-relaxed">
              &ldquo;Still meg om fart, skader, plan-justeringer eller hva som helst.&rdquo;
            </div>
          </div>
          <Link
            href="/dashboard/coach"
            className="flex items-center justify-center gap-2 w-full border border-[rgba(252,82,0,0.30)] text-[#FC5200] py-2.5 rounded-xl text-sm font-bold hover:bg-[rgba(252,82,0,0.08)] transition-colors"
          >
            <MessageCircle size={14} />
            Chat med treneren
          </Link>
        </div>
      </div>
    </div>
  );
}
