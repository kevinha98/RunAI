import { TrendingUp, Activity, Clock, Zap, Calendar } from "lucide-react";
import DashboardSidebar from "../DashboardSidebar";
import { readUserStats } from "@/lib/stats-store";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAnyStravaUserId } from "@/lib/db/user-strava";
import type { StravaActivity } from "@/lib/strava-types";
import { InfoPopup, StorageBadge } from "@/components/InfoPopup";

export const dynamic = "force-dynamic";
export const metadata = { title: "Fremgang" };

const STRAVA_ORANGE = "#FC5200";

// ── Helpers ──────────────────────────────────────────────────────────────────

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getISOWeekNumber(monday: Date): number {
  const jan4 = new Date(monday.getFullYear(), 0, 4);
  const firstMonday = getMonday(jan4);
  return (
    Math.round(
      (monday.getTime() - firstMonday.getTime()) / (7 * 24 * 60 * 60 * 1000)
    ) + 1
  );
}

function formatWeekLabel(monday: Date): string {
  const week = getISOWeekNumber(monday);
  return `U${week}`;
}

function formatPaceFromSecPerKm(secPerKm: number): string {
  if (!secPerKm || secPerKm <= 0) return "\u2014";
  let min = Math.floor(secPerKm / 60);
  let sec = Math.round(secPerKm % 60);
  if (sec === 60) { min += 1; sec = 0; }
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}t ${m}m`;
  return `${m}m`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("nb-NO", {
    day: "numeric",
    month: "short",
  });
}

function activityPaceStr(a: StravaActivity): string {
  if (!a.distance || !a.moving_time) return "\u2014";
  const secPerKm = a.moving_time / (a.distance / 1000);
  return formatPaceFromSecPerKm(secPerKm) + "/km";
}

// ── Weekly data builder ───────────────────────────────────────────────────────

interface WeeklySlot {
  label: string;
  km: number;
  avgPaceSeconds: number | null;
}

function buildWeeklyData(runs: StravaActivity[], numWeeks = 12): WeeklySlot[] {
  const now = new Date();
  const thisMonday = getMonday(now);

  const slots: WeeklySlot[] = Array.from({ length: numWeeks }, (_, i) => {
    const monday = new Date(thisMonday);
    monday.setDate(monday.getDate() - (numWeeks - 1 - i) * 7);
    return {
      label: formatWeekLabel(monday),
      km: 0,
      avgPaceSeconds: null,
    };
  });

  const slotStarts = Array.from({ length: numWeeks }, (_, i) => {
    const monday = new Date(thisMonday);
    monday.setDate(monday.getDate() - (numWeeks - 1 - i) * 7);
    return monday.getTime();
  });

  for (const run of runs) {
    const actDate = new Date(run.start_date_local || run.start_date || "");
    const actMonday = getMonday(actDate).getTime();
    const slotIndex = slotStarts.indexOf(actMonday);
    if (slotIndex === -1) continue;

    const distKm = (run.distance ?? 0) / 1000;
    slots[slotIndex].km += distKm;

    if (run.moving_time && distKm > 0) {
      const paceS = run.moving_time / distKm;
      if (slots[slotIndex].avgPaceSeconds === null) {
        slots[slotIndex].avgPaceSeconds = paceS;
      } else {
        slots[slotIndex].avgPaceSeconds =
          (slots[slotIndex].avgPaceSeconds! + paceS) / 2;
      }
    }
  }

  return slots.map((s) => ({
    ...s,
    km: Math.round(s.km * 10) / 10,
  }));
}

// ── SVG Bar Chart ─────────────────────────────────────────────────────────────

function WeeklyKmBarChart({ data }: { data: WeeklySlot[] }) {
  const maxKm = Math.max(...data.map((d) => d.km), 1);
  const W = 560;
  const H = 120;
  const BOTTOM = 30;
  const n = data.length;
  const totalGap = (n - 1) * 4;
  const barW = Math.floor((W - totalGap) / n);

  return (
    <svg
      viewBox={`0 0 ${W} ${H + BOTTOM}`}
      className="w-full"
      style={{ overflow: "visible" }}
    >
      {/* Horisontale retningslinjer */}
      {[0.25, 0.5, 0.75, 1].map((frac) => {
        const y = H - frac * H;
        const kmVal = Math.round(maxKm * frac);
        return (
          <g key={frac}>
            <line
              x1={0}
              y1={y}
              x2={W}
              y2={y}
              stroke="#E5E5E2"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
            <text
              x={-4}
              y={y + 4}
              textAnchor="end"
              fontSize={9}
              fill="#9B9B95"
            >
              {kmVal}
            </text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const barH = Math.max(d.km > 0 ? 3 : 0, (d.km / maxKm) * H);
        const x = i * (barW + 4);
        const isLast = i === n - 1;
        const fill = isLast ? STRAVA_ORANGE : `${STRAVA_ORANGE}66`;
        return (
          <g key={i}>
            <rect
              x={x}
              y={H - barH}
              width={barW}
              height={barH}
              rx={3}
              fill={fill}
            />
            {d.km > 0 && (
              <text
                x={x + barW / 2}
                y={H - barH - 4}
                textAnchor="middle"
                fontSize={9}
                fill={isLast ? STRAVA_ORANGE : "#9B9B95"}
                fontWeight={isLast ? "bold" : "normal"}
              >
                {d.km}
              </text>
            )}
            <text
              x={x + barW / 2}
              y={H + BOTTOM - 4}
              textAnchor="middle"
              fontSize={9}
              fill={isLast ? STRAVA_ORANGE : "#9B9B95"}
              fontWeight={isLast ? "bold" : "normal"}
            >
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── SVG Pace Line Chart ────────────────────────────────────────────────────────

function WeeklyPaceLineChart({ data }: { data: WeeklySlot[] }) {
  const validSlots = data.filter((d) => d.avgPaceSeconds !== null && d.km > 0);
  if (validSlots.length < 2) {
    return (
      <p className="text-xs text-[#6B6B65] py-4">
        Trenger minst 2 uker med løp for å vise fartsutvikling.
      </p>
    );
  }

  const paces = data.map((d) => d.avgPaceSeconds ?? null);
  const validPaces = paces.filter((p): p is number => p !== null);
  const minPace = Math.min(...validPaces);
  const maxPace = Math.max(...validPaces);
  const range = maxPace - minPace || 60;

  const W = 560;
  const H = 100;
  const BOTTOM = 28;
  const n = data.length;
  const xStep = W / (n - 1);

  const pts = data.map((d, i) => ({
    x: i * xStep,
    y:
      d.avgPaceSeconds !== null && d.km > 0
        ? H - ((maxPace - d.avgPaceSeconds) / range) * (H * 0.85) - H * 0.075
        : null,
    pace: d.avgPaceSeconds,
    label: d.label,
  }));

  const validPts = pts.filter((p) => p.y !== null) as {
    x: number;
    y: number;
    pace: number | null;
    label: string;
  }[];

  const pathD = validPts
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");

  const areaD =
    validPts.length > 1
      ? `${pathD} L${validPts[validPts.length - 1].x.toFixed(1)},${H} L${validPts[0].x.toFixed(1)},${H} Z`
      : "";

  const firstPace = validPaces[0];
  const lastPace = validPaces[validPaces.length - 1];
  const trendDiff = lastPace - firstPace;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp
          size={13}
          className={trendDiff < -5 ? "text-emerald-500" : trendDiff > 5 ? "text-red-400" : "text-[#6B6B65]"}
        />
        <span className="text-xs text-[#6B6B65]">
          {trendDiff < -5
            ? "Farten forbedres"
            : trendDiff > 5
            ? "Farten synker"
            : "Stabil fart"}{" "}
          &middot; siste {validSlots.length} uker
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H + BOTTOM}`}
        className="w-full"
        style={{ overflow: "visible" }}
      >
        <defs>
          <linearGradient id="paceAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={STRAVA_ORANGE} stopOpacity="0.15" />
            <stop offset="100%" stopColor={STRAVA_ORANGE} stopOpacity="0" />
          </linearGradient>
        </defs>
        {areaD && <path d={areaD} fill="url(#paceAreaGrad)" />}
        {pathD && (
          <path
            d={pathD}
            stroke={STRAVA_ORANGE}
            strokeWidth={2}
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
        {pts.map((p, i) => {
          if (p.y === null) return null;
          const isFirst = i === 0;
          const isLast = i === n - 1;
          return (
            <g key={i}>
              <circle
                cx={p.x}
                cy={p.y}
                r={isFirst || isLast ? 4 : 3}
                fill="white"
                stroke={STRAVA_ORANGE}
                strokeWidth={isFirst || isLast ? 2.5 : 1.5}
              />
              {(isFirst || isLast) && p.pace !== null && (
                <text
                  x={p.x}
                  y={p.y - 8}
                  textAnchor={isFirst ? "start" : "end"}
                  fontSize={9}
                  fontWeight="bold"
                  fill={STRAVA_ORANGE}
                >
                  {formatPaceFromSecPerKm(p.pace)}/km
                </text>
              )}
              <text
                x={p.x}
                y={H + BOTTOM - 4}
                textAnchor="middle"
                fontSize={9}
                fill={isLast ? STRAVA_ORANGE : "#9B9B95"}
                fontWeight={isLast ? "bold" : "normal"}
              >
                {p.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Activity List ─────────────────────────────────────────────────────────────

function ActivityList({ runs }: { runs: StravaActivity[] }) {
  const recent = runs.slice(0, 20);

  if (recent.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center">
          <Activity size={22} className="text-[#FC5200]" />
        </div>
        <p className="text-sm text-[#6B6B65]">Ingen aktiviteter funnet</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-[#F0F0EE]">
      {recent.map((run, i) => {
        const distKm = ((run.distance ?? 0) / 1000).toFixed(1);
        const pace = activityPaceStr(run);
        const dateStr = formatDate(run.start_date_local || run.start_date || "");
        const duration = formatDuration(run.moving_time ?? 0);
        const name = run.name || "Løpetur";
        return (
          <li
            key={run.id ?? i}
            className="flex items-center gap-3 py-3 hover:bg-[#FAFAF8] transition-colors rounded-lg px-2 -mx-2"
          >
            <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
              <Activity size={15} className="text-[#FC5200]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#111110] truncate">{name}</p>
              <p className="text-xs text-[#6B6B65]">{dateStr}</p>
            </div>
            <div className="flex items-center gap-4 shrink-0 text-right">
              <div>
                <p className="text-sm font-bold text-[#111110]">{distKm} km</p>
                <p className="text-xs text-[#6B6B65]">{duration}</p>
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: STRAVA_ORANGE }}>{pace}</p>
                <p className="text-xs text-[#6B6B65]">fart</p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ── Summary Stats Card ────────────────────────────────────────────────────────

function SummaryStatCard({
  icon,
  label,
  value,
  unit,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit?: string;
  sub: string;
}) {
  return (
    <div className="bg-white border border-[#E5E5E2] rounded-2xl p-4 hover:border-[#C8C8C4] transition-colors">
      <div className="flex items-center gap-1.5 text-xs text-[#6B6B65] mb-2 font-medium">
        {icon}
        {label}
      </div>
      <div className="text-xl font-black tracking-tight">
        {value}
        {unit && (
          <span className="text-xs font-normal text-[#6B6B65] ml-1">{unit}</span>
        )}
      </div>
      <div className="text-xs text-[#6B6B65] mt-0.5">{sub}</div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ProgressPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    // No auth required — continue without user
  }

  const userId = user?.id ?? await getAnyStravaUserId() ?? "";
  const stats = await readUserStats(userId);

  const allActivities = stats?.recentActivities ?? [];
  const runs = allActivities.filter(
    (a) => a.type === "Run" || a.sport_type === "Run"
  );

  const weeklyData = buildWeeklyData(runs, 12);

  const totalKm = runs.reduce((s, r) => s + (r.distance ?? 0) / 1000, 0);
  const totalRuns = runs.length;
  const weeksWithRuns = weeklyData.filter((w) => w.km > 0);
  const avgKmPerWeek =
    weeksWithRuns.length > 0
      ? weeklyData.reduce((s, w) => s + w.km, 0) / weeksWithRuns.length
      : 0;
  const bestWeekKm = Math.max(...weeklyData.map((w) => w.km), 0);

  const validPaceSlots = weeklyData.filter(
    (w) => w.avgPaceSeconds !== null && w.km > 0
  );
  const overallAvgPace =
    validPaceSlots.length > 0
      ? validPaceSlots.reduce((s, w) => s + (w.avgPaceSeconds ?? 0), 0) /
        validPaceSlots.length
      : null;

  return (
    <div className="min-h-screen bg-[#F5F5F3] text-[#111110] flex">
      <DashboardSidebar stats={stats} activePath="/dashboard/progress" />
      <div className="flex-1 md:ml-60 p-4 md:p-8 pb-24 md:pb-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={20} className="text-[#FC5200]" />
            <h1 className="text-2xl font-black tracking-tight">Fremgang</h1>
            <InfoPopup>
              <strong className="block mb-1">Fremgang</strong>
              <p className="mb-2">Viser løpsutviklingen din over tid basert på Strava-data: ukentlig km, gjennomsnittlig pace og enkeltaktiviteter.</p>
              <StorageBadge type="readonly" />
              <p className="mt-1 text-[10px] text-[#9B9B95]">Dataene leses fra Strava og kan ikke redigeres her. Synkroniser via sidemenyen for å hente siste løp.</p>
            </InfoPopup>
          </div>
          <p className="text-sm text-[#6B6B65]">
            Løpeutvikling basert på dine Strava-aktiviteter
          </p>
        </div>

        {!stats ? (
          <div className="bg-white border border-[#E5E5E2] rounded-2xl p-10 max-w-md flex flex-col items-center gap-4 text-center">
            <div className="w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center">
              <TrendingUp className="w-7 h-7 text-[#FC5200]" />
            </div>
            <h2 className="text-xl font-bold tracking-tight">Koble til Strava</h2>
            <p className="text-[#6B6B65] text-sm leading-relaxed">
              Koble til Strava-kontoen din for å se fremgangsstatistikk.
            </p>
          </div>
        ) : (
          <div className="max-w-4xl">
            {/* Stat-kort */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <SummaryStatCard
                icon={<Activity size={12} className="text-[#FC5200]" />}
                label="Totalt km"
                value={String(Math.round(totalKm))}
                unit="km"
                sub={`${totalRuns} løp`}
              />
              <SummaryStatCard
                icon={<Calendar size={12} className="text-[#FC5200]" />}
                label="Snitt/uke"
                value={avgKmPerWeek.toFixed(1)}
                unit="km"
                sub="siste 12 uker"
              />
              <SummaryStatCard
                icon={<Zap size={12} className="text-[#FC5200]" />}
                label="Beste uke"
                value={bestWeekKm.toFixed(1)}
                unit="km"
                sub="siste 12 uker"
              />
              <SummaryStatCard
                icon={<Clock size={12} className="text-[#FC5200]" />}
                label="Snittfart"
                value={
                  overallAvgPace
                    ? formatPaceFromSecPerKm(overallAvgPace)
                    : "\u2014"
                }
                unit={overallAvgPace ? "/km" : undefined}
                sub="siste 12 uker"
              />
            </div>

            {/* Ukentlig km bar chart */}
            <div className="bg-white border border-[#E5E5E2] rounded-2xl p-5 mb-5 hover:border-[#C8C8C4] transition-colors">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-[#111110]">Ukentlig km</h2>
                <span className="text-xs text-[#6B6B65]">Siste 12 uker</span>
              </div>
              {runs.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <Activity size={24} className="text-[#C8C8C4]" />
                  <p className="text-sm text-[#6B6B65]">Ingen løp registrert ennå</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <div style={{ minWidth: "320px" }}>
                    <WeeklyKmBarChart data={weeklyData} />
                  </div>
                </div>
              )}
            </div>

            {/* Fart per uke linjediagram */}
            <div className="bg-white border border-[#E5E5E2] rounded-2xl p-5 mb-5 hover:border-[#C8C8C4] transition-colors">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-[#111110]">
                  Gjennomsnittsfart per uke
                </h2>
                <span className="text-xs text-[#6B6B65]">Siste 12 uker</span>
              </div>
              <div className="overflow-x-auto">
                <div style={{ minWidth: "320px" }}>
                  <WeeklyPaceLineChart data={weeklyData} />
                </div>
              </div>
            </div>

            {/* Siste 20 aktiviteter */}
            <div className="bg-white border border-[#E5E5E2] rounded-2xl p-5 hover:border-[#C8C8C4] transition-colors">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-[#111110]">
                  Siste aktiviteter
                </h2>
                <span className="text-xs text-[#6B6B65]">
                  {Math.min(runs.length, 20)} av {runs.length}
                </span>
              </div>
              <ActivityList runs={runs} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
