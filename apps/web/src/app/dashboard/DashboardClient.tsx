"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  Trophy,
} from "lucide-react";
import type { StoredStats, StravaActivity } from "@/lib/strava-types";
import { formatPace, computePaceZoneDistribution, computePersonalBests } from "@/lib/strava-types";
import { getCurrentWeek, WEEKS, PLAN_START, RACE_DATE as RACE_DATE_OBJ } from "@/lib/plan-data";
import type { Phase } from "@/lib/plan-data";

const STRAVA_ORANGE = "#FC5200";
const RACE_DATE = "2027-04-24";

// Map Norwegian day abbreviations to JS getDay() index (0=Sun)
const DAY_IDX: Record<string, number> = {
  Man: 1, Tir: 2, Ons: 3, Tor: 4, Fre: 5, Lør: 6, Søn: 0,
};

/**
 * Returns the Monday 00:00:00 local time for the week containing `date`.
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Returns the Sunday 23:59:59.999 local time for the week containing `date`.
 */
function getWeekEnd(date: Date): Date {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

/**
 * Returns an ISO 8601 week key on the format 'YYYY-Www' for the given date.
 */
function getISOWeekKey(date: Date): string {
  const weekStart = getWeekStart(date);
  const thursday = new Date(weekStart);
  thursday.setDate(weekStart.getDate() + 3);
  const isoYear = thursday.getFullYear();
  const jan4 = new Date(isoYear, 0, 4);
  const firstMonday = getWeekStart(jan4);
  const weekNum =
    Math.round(
      (weekStart.getTime() - firstMonday.getTime()) / (7 * 24 * 60 * 60 * 1000)
    ) + 1;
  return `${isoYear}-W${String(weekNum).padStart(2, "00")}`;
}

/**
 * Returns 'YYYY-MM-DD' for a StravaActivity based on start_date_local.
 */
function getActivityDateStr(activity: StravaActivity): string {
  return new Date(activity.start_date_local).toLocaleDateString("sv-SE");
}

/**
 * Returns 'YYYY-MM-DD' for the planned session day in the current week.
 */
function getSessionDate(sessionDay: string): string {
  const targetDayIdx = DAY_IDX[sessionDay];
  if (targetDayIdx === undefined) return "";
  const weekStart = getWeekStart(new Date()); // Monday
  const diffFromMonday = targetDayIdx === 0 ? 6 : targetDayIdx - 1;
  const sessionDate = new Date(weekStart);
  sessionDate.setDate(weekStart.getDate() + diffFromMonday);
  return sessionDate.toLocaleDateString("sv-SE");
}

/**
 * Checks whether a planned session has a matching Strava activity on the exact same date.
 */
function isSessionDone(sessionDay: string, recentRuns: StravaActivity[]): boolean {
  const sessionDateStr = getSessionDate(sessionDay);
  if (!sessionDateStr) return false;
  return recentRuns.some((run) => getActivityDateStr(run) === sessionDateStr);
}

function getPlanSessions(recentRuns: StravaActivity[]) {
  const weekData = WEEKS.find((w) => w.week === getCurrentWeek()) ?? WEEKS[0];
  return weekData.sessions.map((s) => ({
    ...s,
    dayIdx: DAY_IDX[s.day] ?? 0,
    done: isSessionDone(s.day, recentRuns),
  }));
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

function getWeeklyPlanKm(): number {
  const currentWeek = getCurrentWeek();
  const weekData = WEEKS.find((w) => w.week === currentWeek) ?? WEEKS[0];
  return weekData.totalKm;
}

function getWeeklyActualKm(runs: StravaActivity[]): number {
  const now = new Date();
  const monday = getWeekStart(now);
  return runs
    .filter((r) => new Date(r.start_date_local) >= monday)
    .reduce((sum, r) => sum + r.distance / 1000, 0);
}

/**
 * Buckets runs by ISO 8601 week (Monday-start) using getISOWeekKey().
 */
function weeklyKmBuckets(
  runs: StravaActivity[],
  n = 8
): { label: string; km: number; weekNum: string }[] {
  const map: Record<string, number> = {};

  for (const r of runs) {
    const d = new Date(r.start_date_local);
    const key = getISOWeekKey(d);
    map[key] = (map[key] ?? 0) + r.distance / 1000;
  }

  const sorted = Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-n);

  return sorted.map(([key, km]) => {
    const weekPart = key.split("-W")[1] ?? key;
    return {
      label: `W${weekPart}`,
      km: Math.round(km * 10) / 10,
      weekNum: weekPart,
    };
  });
}

// Marathon progress helper
function getMarathonProgress(): { daysLeft: number; currentPhase: Phase; pct: number } {
  const now = new Date();
  const planStart = PLAN_START.getTime();
  const raceEnd = RACE_DATE_OBJ.getTime();
  const totalMs = raceEnd - planStart;
  const elapsedMs = Math.max(0, now.getTime() - planStart);
  const pct = Math.min(100, Math.max(0, Math.round((elapsedMs / totalMs) * 1000) / 10));
  const msLeft = raceEnd - now.getTime();
  const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
  const currentWeek = getCurrentWeek();
  const weekData = WEEKS.find((w) => w.week === currentWeek) ?? WEEKS[0];
  return { daysLeft, currentPhase: weekData.phase, pct };
}

// Phase badge helper
function getPhaseBadgeClass(phase: Phase): string {
  switch (phase) {
    case "Grunntrening": return "bg-green-100 text-green-800 border border-green-300";
    case "Bygging":      return "bg-blue-100 text-blue-800 border border-blue-300";
    case "Topp":         return "bg-purple-100 text-purple-800 border border-purple-300";
    case "Nedtrapping":  return "bg-yellow-100 text-yellow-800 border border-yellow-300";
    default:             return "bg-gray-100 text-gray-800 border border-gray-300";
  }
}

// Tooltip helpers
function clampTooltipX(cx: number, tooltipW: number, svgW: number): number {
  return Math.min(Math.max(cx - tooltipW / 2, 2), svgW - tooltipW - 2);
}

function clampTooltipY(cy: number, tooltipH: number, minY: number): number {
  const above = cy - tooltipH - 8;
  return above < minY ? cy + 12 : above;
}

/**
 * Formats total seconds as 'H:MM:SS' (with hours) or 'M:SS' (under 1 hour).
 */
function formatPRTime(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) return "—";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ── Aktivitetskalender-hjelpefunksjoner ──────────────────────────────────────

/**
 * Builds a map from 'YYYY-MM-DD' → total km run that day.
 */
function buildActivityHeatmap(runs: StravaActivity[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const run of runs) {
    const dateStr = new Date(run.start_date_local).toLocaleDateString("sv-SE");
    map.set(dateStr, (map.get(dateStr) ?? 0) + run.distance / 1000);
  }
  return map;
}

/**
 * Returns a Tailwind bg-color class based on km run on a given day.
 * 0 km → white, <5 → light green, 5-10 → medium green, >10 → dark green.
 */
function getDayColor(km: number): string {
  if (km <= 0) return "bg-white border border-gray-200";
  if (km < 5)  return "bg-green-200";
  if (km <= 10) return "bg-green-500";
  return "bg-green-800";
}

/**
 * Returns an array of 56 Date objects for the last 8 weeks,
 * starting from the Monday 8 weeks ago.
 */
function getLast8WeeksDays(): Date[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMonday = getWeekStart(today);
  const startMonday = new Date(todayMonday);
  startMonday.setDate(todayMonday.getDate() - 7 * 7);
  const days: Date[] = [];
  for (let i = 0; i < 56; i++) {
    const d = new Date(startMonday);
    d.setDate(startMonday.getDate() + i);
    days.push(d);
  }
  return days;
}

// ── ActivityCalendar-komponent ────────────────────────────────────────────────

function ActivityCalendar({ runs }: { runs: StravaActivity[] }) {
  const heatmap = useMemo(() => buildActivityHeatmap(runs), [runs]);
  const days = useMemo(() => getLast8WeeksDays(), []);
  const todayStr = useMemo(() => new Date().toLocaleDateString("sv-SE"), []);

  // Split into 8 weeks of 7 days (each week is a column, Mon-Sun)
  const weeks: Date[][] = [];
  for (let w = 0; w < 8; w++) {
    weeks.push(days.slice(w * 7, w * 7 + 7));
  }

  const dayLabels = ["M", "T", "O", "T", "F", "L", "S"];

  return (
    <div className="bg-white border border-[#E5E5E2] rounded-2xl p-4 mb-5 hover:border-[#C8C8C4] transition-colors">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-[#111110]">Aktivitetskalender</h3>
        <span className="text-xs text-[#6B6B65]">Siste 8 uker</span>
      </div>
      <div className="flex gap-1">
        {/* Dag-etiketter */}
        <div className="flex flex-col gap-[3px] mr-1">
          {dayLabels.map((label, i) => (
            <span
              key={i}
              className="text-[9px] text-[#9B9B95] leading-none flex items-center"
              style={{ height: "12px" }}
            >
              {label}
            </span>
          ))}
        </div>
        {/* Uker som kolonner */}
        {weeks.map((week, wi) => {
          const firstDay = week[0];
          const monthLabel = wi === 0 || firstDay.getDate() <= 7
            ? firstDay.toLocaleDateString("nb-NO", { month: "short" })
            : "";
          return (
            <div key={wi} className="flex flex-col">
              {/* Månedslabel over kolonnen */}
              <span className="text-[9px] text-[#9B9B95] leading-none mb-1 h-3">
                {monthLabel}
              </span>
              <div className="flex flex-col gap-[3px]">
                {week.map((day, di) => {
                  const dateStr = day.toLocaleDateString("sv-SE");
                  const km = heatmap.get(dateStr) ?? 0;
                  const colorClass = getDayColor(km);
                  const isToday = dateStr === todayStr;
                  const isFuture = day > new Date();
                  return (
                    <div
                      key={di}
                      title={isFuture ? dateStr : `${dateStr}: ${km > 0 ? km.toFixed(1) + " km" : "Ingen økt"}`}
                      className={`rounded-sm cursor-default transition-opacity hover:opacity-75 ${
                        isFuture ? "bg-[#F5F5F3] border border-[#EBEBEA]" : colorClass
                      } ${isToday ? "ring-1 ring-[#FC5200] ring-offset-0" : ""}`}
                      style={{ width: "12px", height: "12px" }}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {/* Forklaring */}
      <div className="flex items-center gap-3 mt-3">
        <span className="text-[10px] text-[#9B9B95]">Mindre</span>
        <div className="flex gap-1">
          <div className="w-3 h-3 rounded-sm bg-white border border-gray-200" title="0 km" />
          <div className="w-3 h-3 rounded-sm bg-green-200" title="< 5 km" />
          <div className="w-3 h-3 rounded-sm bg-green-500" title="5–10 km" />
          <div className="w-3 h-3 rounded-sm bg-green-800" title="> 10 km" />
        </div>
        <span className="text-[10px] text-[#9B9B95]">Mer</span>
      </div>
    </div>
  );
}

// Pulserende grønn dot-indikator
function SyncFreshDot() {
  return (
    <span className="relative flex items-center justify-center w-2.5 h-2.5 shrink-0">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
    </span>
  );
}

// Charts

function BarChart({ data, color = STRAVA_ORANGE }: {
  data: { label: string; value: number }[];
  color?: string;
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.value), 1);
  const W = 320;
  const H = 80;
  const BAR_W = Math.floor((W - (data.length - 1) * 4) / data.length);
  const TOOLTIP_W = 96;
  const TOOLTIP_H = 44;

  return (
    <svg
      viewBox={`0 0 ${W} ${H + 20}`}
      className="w-full"
      style={{ overflow: "visible" }}
      onMouseLeave={() => setHoveredIndex(null)}
    >
      {data.map((d, i) => {
        const barH = Math.max(3, (d.value / max) * H);
        const x = i * (BAR_W + 4);
        const isLast = i === data.length - 1;
        const isHovered = hoveredIndex === i;
        const cx = x + BAR_W / 2;
        const tx = clampTooltipX(cx, TOOLTIP_W, W);
        const ty = clampTooltipY(H - barH, TOOLTIP_H, 0);

        return (
          <g
            key={i}
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
            style={{ cursor: "pointer" }}
          >
            <rect x={x} y={0} width={BAR_W} height={H} fill="transparent" />
            <rect
              x={x}
              y={H - barH}
              width={BAR_W}
              height={barH}
              rx={3}
              fill={isHovered ? color : isLast ? color : `${color}55`}
            />
            <text x={cx} y={H + 14} textAnchor="middle" fontSize={9} fill="#6B6B65">
              {d.label}
            </text>
            {isLast && !isHovered && (
              <text
                x={cx}
                y={H - barH - 4}
                textAnchor="middle"
                fontSize={9}
                fontWeight="bold"
                fill={color}
              >
                {d.value}
              </text>
            )}
            {isHovered && (
              <g style={{ pointerEvents: "none" }}>
                <rect
                  x={tx}
                  y={ty}
                  width={TOOLTIP_W}
                  height={TOOLTIP_H}
                  rx={5}
                  fill="white"
                  stroke="#E5E5E2"
                  strokeWidth={1}
                  style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.10))" }}
                />
                <text x={tx + TOOLTIP_W / 2} y={ty + 14} textAnchor="middle" fontSize={8} fill="#6B6B65" fontWeight="600">
                  Uke {d.label}
                </text>
                <text x={tx + TOOLTIP_W / 2} y={ty + 30} textAnchor="middle" fontSize={11} fontWeight="bold" fill={STRAVA_ORANGE}>
                  {d.value} km
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function PaceTrendChart({ runs }: { runs: StravaActivity[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const last10 = runs.slice(0, 10).reverse().filter((r) => r.distance > 0 && r.moving_time > 0);
  if (last10.length < 2) return <p className="text-xs text-[#6B6B65]">Trenger minst 2 løp</p>;

  const paces = last10.map((r) => activityPaceSec(r));
  const maxP = Math.max(...paces);
  const range = maxP - Math.min(...paces) || 60;
  const W = 280;
  const H = 60;
  const TOOLTIP_W = 110;
  const TOOLTIP_H = 52;

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
      <svg
        viewBox={`0 0 ${W} ${H + 24}`}
        className="w-full"
        style={{ overflow: "visible" }}
        onMouseLeave={() => setHoveredIndex(null)}
      >
        <defs>
          <linearGradient id="paceGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={STRAVA_ORANGE} stopOpacity="0.18" />
            <stop offset="100%" stopColor={STRAVA_ORANGE} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#paceGrad)" />
        <path d={pathD} stroke={STRAVA_ORANGE} strokeWidth="2" fill="none" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => {
          const isHovered = hoveredIndex === i;
          const tx = clampTooltipX(p.x, TOOLTIP_W, W);
          const ty = clampTooltipY(p.y, TOOLTIP_H, 0);
          const dateLabel = formatDate(last10[i].start_date_local);
          const paceLabel = formatPace(paces[i]);
          const distKm = (last10[i].distance / 1000).toFixed(1);

          return (
            <g key={i}>
              <circle
                cx={p.x}
                cy={p.y}
                r={10}
                fill="transparent"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                style={{ cursor: "pointer" }}
              />
              <circle
                cx={p.x}
                cy={p.y}
                r={isHovered ? 4.5 : 3}
                fill="white"
                stroke={STRAVA_ORANGE}
                strokeWidth={isHovered ? 2.5 : 1.5}
                style={{ pointerEvents: "none", transition: "r 0.1s" }}
              />
              <text x={p.x} y={H + 16} textAnchor="middle" fontSize={8} fill="#6B6B65" style={{ pointerEvents: "none" }}>
                {dateLabel.split(" ")[0]}
              </text>
              {isHovered && (
                <g style={{ pointerEvents: "none" }}>
                  <rect
                    x={tx} y={ty} width={TOOLTIP_W} height={TOOLTIP_H}
                    rx={5} fill="white" stroke="#E5E5E2" strokeWidth={1}
                    style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.10))" }}
                  />
                  <text x={tx + TOOLTIP_W / 2} y={ty + 14} textAnchor="middle" fontSize={8} fill="#6B6B65" fontWeight="600">
                    {dateLabel}
                  </text>
                  <text x={tx + TOOLTIP_W / 2} y={ty + 30} textAnchor="middle" fontSize={11} fontWeight="bold" fill={STRAVA_ORANGE}>
                    {paceLabel}/km
                  </text>
                  <text x={tx + TOOLTIP_W / 2} y={ty + 44} textAnchor="middle" fontSize={8} fill="#6B6B65">
                    {distKm} km
                  </text>
                </g>
              )}
            </g>
          );
        })}
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

function ZoneDistributionChart({ runs, avgPaceSecPerKm }: { runs: StravaActivity[]; avgPaceSecPerKm: number }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const distribution = useMemo(
    () => computePaceZoneDistribution(runs, avgPaceSecPerKm, 20),
    [runs, avgPaceSecPerKm]
  );

  const totalCount = useMemo(
    () => distribution.reduce((sum, z) => sum + z.count, 0),
    [distribution]
  );

  const hasChartData = totalCount > 0;

  if (!hasChartData) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-sm">Fartsone-fordeling</h3>
          <span className="text-xs text-[#6B6B65]">Siste 20 løp</span>
        </div>
        <p className="text-xs text-[#6B6B65]">Trenger flere løp med data</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-sm">Fartsone-fordeling</h3>
        <span className="text-xs text-[#6B6B65]">Siste 20 løp</span>
      </div>

      {/* Stacked bar */}
      <div className="flex h-8 w-full rounded-lg overflow-hidden gap-px mb-4">
        {distribution.map((z, i) => {
          if (z.percentage === 0) return null;
          return (
            <div
              key={z.zone.label}
              className={`${z.zone.bgClass} relative flex items-center justify-center cursor-pointer transition-opacity duration-150`}
              style={{
                width: `${z.percentage}%`,
                opacity: hoveredIndex === null || hoveredIndex === i ? 1 : 0.4,
              }}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              title={`${z.zone.label}: ${z.percentage}%`}
            >
              {z.percentage >= 10 && (
                <span className="text-[10px] font-bold text-white drop-shadow-sm select-none">
                  {z.percentage}%
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {distribution.map((z, i) => (
          <div
            key={z.zone.label}
            className="flex items-center gap-2 cursor-pointer"
            style={{
              opacity: hoveredIndex === null || hoveredIndex === i ? 1 : 0.4,
            }}
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <span className={`w-2.5 h-2.5 rounded-sm flex-shrink-0 ${z.zone.bgClass}`} />
            <span className={`text-xs font-medium ${z.zone.textClass}`}>
              {z.zone.label}
            </span>
            <span className="text-xs text-[#6B6B65] ml-auto">
              {z.percentage}%
            </span>
          </div>
        ))}
      </div>

      {/* Hover detail */}
      {hoveredIndex !== null && distribution[hoveredIndex] && (
        <div className="mt-3 pt-3 border-t border-[#F0F0EE]">
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold ${distribution[hoveredIndex].zone.textClass}`}>
              {distribution[hoveredIndex].zone.label}
            </span>
            <span className="text-xs text-[#6B6B65]">
              {distribution[hoveredIndex].count} av {totalCount} løp
            </span>
          </div>
        </div>
      )}

      <p className="text-[10px] text-[#6B6B65] mt-auto pt-3">
        Basert på {Math.min(runs.length, 20)} løp
      </p>
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

function WeeklyProgressBar({ runs }: { runs: StravaActivity[] }) {
  const planKm = getWeeklyPlanKm();
  const actualKm = getWeeklyActualKm(runs);
  const roundedKm = Math.round(actualKm * 10) / 10;
  const percent = planKm > 0 ? Math.min(100, (roundedKm / planKm) * 100) : 0;
  const isComplete = percent >= 100;
  const remaining = Math.max(0, Math.round((planKm - roundedKm) * 10) / 10);

  return (
    <div className="col-span-2 md:col-span-4 bg-white border border-[#E5E5E2] rounded-2xl px-4 py-3 hover:border-[#C8C8C4] transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs text-[#6B6B65] font-medium">
          <BarChart2 size={13} className="text-[#FC5200]" />
          Ukentlig km-mål
        </div>
        <span
          className="text-xs font-bold"
          style={{ color: isComplete ? "#10b981" : STRAVA_ORANGE }}
        >
          {roundedKm} / {planKm} km
        </span>
      </div>
      <div className="w-full h-2.5 bg-[#F0F0EE] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${percent.toFixed(1)}%`,
            backgroundColor: isComplete ? "#10b981" : STRAVA_ORANGE,
          }}
        />
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-[10px] text-[#6B6B65]">{Math.round(percent)}% fullført</span>
        {isComplete ? (
          <span className="text-[10px] font-semibold text-emerald-500">✓ Ukesmål nådd!</span>
        ) : (
          <span className="text-[10px] text-[#6B6B65]">{remaining} km gjenstår</span>
        )}
      </div>
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

// Mobile Marathon Progress Banner
function MobileMarathonBanner() {
  const { daysLeft, currentPhase, pct } = getMarathonProgress();

  const phaseColorMap: Record<Phase, string> = {
    Grunntrening: "text-blue-400",
    Bygging: "text-orange-400",
    Topp: "text-red-400",
    Nedtrapping: "text-emerald-400",
  };

  const barColorMap: Record<Phase, string> = {
    Grunntrening: "bg-blue-400",
    Bygging: "bg-orange-400",
    Topp: "bg-red-400",
    Nedtrapping: "bg-emerald-400",
  };

  return (
    <div className="md:hidden bg-[#1C1C1A] rounded-xl px-4 py-3 mb-5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-white tabular-nums">{daysLeft}</span>
          <span className="text-xs text-[#8A8A85]">dager til løpet</span>
        </div>
        <span className={`text-xs font-semibold ${phaseColorMap[currentPhase]}`}>
          {currentPhase}
        </span>
      </div>
      <div className="w-full h-1 bg-[#2E2E2C] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColorMap[currentPhase]}`}
          style={{ width: `${pct.toFixed(1)}%` }}
        />
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-[10px] text-[#6B6B65]">Bergen City Marathon</span>
        <span className="text-[10px] text-[#6B6B65]">{pct.toFixed(0)}% fullført</span>
      </div>
    </div>
  );
}

// Empty state banner — athlete connected but no runs yet
function EmptyRunsBanner({ onSync, isSyncing, athleteId }: {
  onSync: () => void;
  isSyncing: boolean;
  athleteId?: number | null;
}) {
  const stravaProfileUrl = athleteId
    ? `https://www.strava.com/athletes/${athleteId}`
    : "https://www.strava.com/dashboard";

  return (
    <div className="mb-6 rounded-2xl border border-dashed border-[rgba(252,82,0,0.35)] bg-orange-50 p-8 flex flex-col items-center gap-4 text-center">
      <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center">
        <Activity size={28} className="text-[#FC5200]" />
      </div>

      <div className="space-y-1.5">
        <p className="text-base font-semibold text-gray-800">
          Ingen løp registrert ennå
        </p>
        <p className="text-sm text-gray-500 max-w-sm leading-relaxed">
          Strava-kontoen din er koblet til, men vi finner ingen løpeaktiviteter.
          Fullfør et løp og synkroniser med Strava — da fyller dashbordet seg
          med statistikk og fremgangsdata.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 justify-center mt-1">
        <button
          onClick={onSync}
          disabled={isSyncing}
          className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: STRAVA_ORANGE }}
        >
          <Zap size={14} />
          {isSyncing ? "Synkroniserer…" : "Synkroniser nå"}
        </button>

        <a
          href={stravaProfileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl border border-[#E5E5E2] bg-white px-5 py-2.5 text-sm font-semibold text-[#111110] hover:border-[#C8C8C4] transition-colors"
        >
          <StravaIcon />
          Åpne Strava
        </a>
      </div>
    </div>
  );
}

// ── DashboardClient ───────────────────────────────────────────────────────────

export default function DashboardClient({
  stravaData,
  stravaStatus,
}: {
  stravaData: StoredStats;
  stravaStatus: string | null;
}) {
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"oversikt" | "aktiviteter" | "statistikk">("oversikt");
  const [expandedActivity, setExpandedActivity] = useState<number | null>(null);

  const { athlete, recentRuns, computed, lastSync } = stravaData;
  const { avgPaceSecPerKm } = computed;

  const isStravaConnected = !!athlete;
  const hasRuns = recentRuns.length > 0;

  // Show sync status from URL param
  useEffect(() => {
    if (stravaStatus === "connected") {
      setSyncMessage("Strava-konto koblet til! 🎉");
      setTimeout(() => setSyncMessage(null), 5000);
    } else if (stravaStatus === "error") {
      setSyncMessage("Noe gikk galt med Strava-tilkoblingen.");
      setTimeout(() => setSyncMessage(null), 5000);
    }
  }, [stravaStatus]);

  const handleSync = useCallback(async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch("/api/strava/sync", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setSyncMessage(`Synkronisert! ${data.count ?? ""} aktiviteter hentet.`);
        router.refresh();
      } else {
        setSyncMessage(data.error ?? "Synkronisering feilet.");
      }
    } catch {
      setSyncMessage("Nettverksfeil under synkronisering.");
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncMessage(null), 6000);
    }
  }, [router]);

  const planSessions = useMemo(() => getPlanSessions(recentRuns), [recentRuns]);

  const weeklyBuckets = useMemo(() => {
    const buckets = weeklyKmBuckets(recentRuns, 8);
    return buckets.map((b) => ({ label: b.label, value: b.km }));
  }, [recentRuns]);

  const personalBests = useMemo(() => computePersonalBests(recentRuns), [recentRuns]);

  const lastSyncLabel = useMemo(() => {
    if (!lastSync) return "Aldri synkronisert";
    const d = new Date(lastSync);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "Nettopp synkronisert";
    if (diffMin < 60) return `${diffMin} min siden`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}t siden`;
    return d.toLocaleDateString("nb-NO", { day: "numeric", month: "short" });
  }, [lastSync]);

  const isSyncFresh = useMemo(() => {
    if (!lastSync) return false;
    return new Date().getTime() - new Date(lastSync).getTime() < 5 * 60 * 1000;
  }, [lastSync]);

  return (
    <main className="flex-1 min-h-screen overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Mobile Marathon Banner */}
        <MobileMarathonBanner />

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black tracking-tight">
              {athlete ? `Hei, ${athlete.firstname}! 👋` : "Dashboard"}
            </h1>
            <p className="text-sm text-[#6B6B65] mt-0.5">
              {hasRuns
                ? `${recentRuns.length} løp synkronisert`
                : "Ingen løp ennå"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isStravaConnected ? (
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-[#E5E5E2] bg-white hover:border-[#C8C8C4] transition-colors disabled:opacity-50"
              >
                {isSyncing ? (
                  <span className="animate-spin">⟳</span>
                ) : isSyncFresh ? (
                  <SyncFreshDot />
                ) : (
                  <StravaIcon />
                )}
                {isSyncing ? "Synker…" : lastSyncLabel}
              </button>
            ) : (
              <a
                href="/api/strava/auth"
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: STRAVA_ORANGE }}
              >
                <StravaIcon />
                Koble til Strava
              </a>
            )}
          </div>
        </div>

        {/* Sync message */}
        {syncMessage && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-orange-50 border border-orange-200 text-sm text-orange-800 font-medium">
            {syncMessage}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-[#EBEBEA] rounded-xl p-1">
          {(["oversikt", "aktiviteter", "statistikk"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 text-xs font-semibold py-2 rounded-lg capitalize transition-colors ${
                activeTab === tab
                  ? "bg-white text-[#111110] shadow-sm"
                  : "text-[#6B6B65] hover:text-[#111110]"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* ── OVERSIKT TAB ── */}
        {activeTab === "oversikt" && (
          <div className="space-y-5">
            {!isStravaConnected && (
              <div className="rounded-2xl border border-dashed border-[rgba(252,82,0,0.35)] bg-orange-50 p-6 text-center">
                <p className="text-sm font-semibold text-gray-700 mb-1">Koble til Strava</p>
                <p className="text-xs text-gray-500 mb-4">Synkroniser løpene dine for å se statistikk og fremgang.</p>
                <a
                  href="/api/strava/auth"
                  className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
                  style={{ backgroundColor: STRAVA_ORANGE }}
                >
                  <StravaIcon />
                  Koble til Strava
                </a>
              </div>
            )}

            {isStravaConnected && !hasRuns && (
              <EmptyRunsBanner
                onSync={handleSync}
                isSyncing={isSyncing}
                athleteId={athlete?.id}
              />
            )}

            {hasRuns && (
              <>
                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-3">
                  <WeeklyProgressBar runs={recentRuns} />
                  <StatCard
                    icon={<Activity size={13} className="text-[#FC5200]" />}
                    label="Denne uken"
                    value={`${Math.round(getWeeklyActualKm(recentRuns) * 10) / 10}`}
                    unit="km"
                    sub={`Mål: ${getWeeklyPlanKm()} km`}
                  />
                  <StatCard
                    icon={<Timer size={13} className="text-[#FC5200]" />}
                    label="Snittfart"
                    value={avgPaceSecPerKm > 0 ? formatPace(avgPaceSecPerKm) : "—"}
                    unit="/km"
                    sub="Siste løp"
                  />
                  <StatCard
                    icon={<TrendingUp size={13} className="text-[#FC5200]" />}
                    label="Totalt i år"
                    value={`${Math.round(computed.ytdKm)}`}
                    unit="km"
                    sub={`${computed.totalRunsAllTime} løp totalt`}
                  />
                  <StatCard
                    icon={<Mountain size={13} className="text-[#FC5200]" />}
                    label="Lengste løp"
                    value={`${metersToKm(recentRuns.reduce((max, r) => Math.max(max, r.distance), 0))}`}
                    unit="km"
                    sub="Noensinne"
                  />
                </div>

                {/* Ukentlig km-chart */}
                {weeklyBuckets.length > 0 && (
                  <div className="bg-white border border-[#E5E5E2] rounded-2xl p-4 hover:border-[#C8C8C4] transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-[#111110]">Ukentlig km</h3>
                      <span className="text-xs text-[#6B6B65]">Siste 8 uker</span>
                    </div>
                    <BarChart data={weeklyBuckets} />
                  </div>
                )}

                {/* Ukensplan */}
                <div className="bg-white border border-[#E5E5E2] rounded-2xl p-4 hover:border-[#C8C8C4] transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-[#111110]">Ukensplan</h3>
                    <Link
                      href="/plan"
                      className="text-xs text-[#FC5200] font-semibold flex items-center gap-0.5 hover:underline"
                    >
                      Se full plan <ChevronRight size={12} />
                    </Link>
                  </div>
                  <div className="space-y-2">
                    {planSessions.map((session, i) => (
                      <div
                        key={i}
                        className={`flex items-center gap-3 p-2.5 rounded-xl text-sm transition-colors ${
                          session.done
                            ? "bg-emerald-50 border border-emerald-100"
                            : "bg-[#F8F8F7] border border-transparent"
                        }`}
                      >
                        <span className="text-base">{session.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs truncate">{session.type}</span>
                            {session.done && (
                              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                                ✓ Ferdig
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-[#6B6B65] truncate">
                            {session.day} · {session.distance} · {session.pace}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI Coach quick link */}
                <Link
                  href="/coach"
                  className="flex items-center justify-between p-4 bg-[#1C1C1A] text-white rounded-2xl hover:bg-[#2A2A28] transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#FC5200] flex items-center justify-center shrink-0">
                      <Brain size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-bold">AI Løpetrener</p>
                      <p className="text-xs text-[#8A8A85]">Få personlig treningsrådgivning</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-[#6B6B65] group-hover:text-white transition-colors" />
                </Link>
              </>
            )}
          </div>
        )}

        {/* ── AKTIVITETER TAB ── */}
        {activeTab === "aktiviteter" && (
          <div>
            {!hasRuns ? (
              <EmptyRunsBanner
                onSync={handleSync}
                isSyncing={isSyncing}
                athleteId={athlete?.id}
              />
            ) : (
              <>
                {/* Aktivitetskalender — øverst */}
                <ActivityCalendar runs={recentRuns} />

                <div className="space-y-3">
                  {recentRuns.slice(0, 20).map((run, i) => {
                    const isExpanded = expandedActivity === i;
                    const pace = activityPace(run);
                    const km = metersToKm(run.distance);
                    const duration = formatMovingTime(run.moving_time);
                    const dateLabel = formatDate(run.start_date_local);
                    const elevGain = run.total_elevation_gain ?? 0;
                    const maxSpeed = run.max_speed ? mpsToKmh(run.max_speed) : null;
                    const avgHr = run.average_heartrate ?? null;
                    const maxHr = run.max_heartrate ?? null;

                    return (
                      <div
                        key={run.id ?? i}
                        className="bg-white border border-[#E5E5E2] rounded-2xl overflow-hidden hover:border-[#C8C8C4] transition-colors"
                      >
                        <button
                          className="w-full text-left px-4 py-3.5 flex items-center gap-3"
                          onClick={() => setExpandedActivity(isExpanded ? null : i)}
                        >
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white text-sm"
                            style={{ backgroundColor: STRAVA_ORANGE }}
                          >
                            <Play size={14} fill="white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm truncate">
                              {run.name ?? `Løpetur ${i + 1}`}
                            </p>
                            <p className="text-xs text-[#6B6B65]">
                              {dateLabel} · {km} km · {duration}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold tabular-nums">{pace}</p>
                            <p className="text-[10px] text-[#6B6B65]">/km</p>
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="px-4 pb-4 border-t border-[#F0F0EE] pt-3">
                            <div className="grid grid-cols-3 gap-3">
                              <div className="text-center">
                                <p className="text-[10px] text-[#9B9B95] mb-0.5">Distanse</p>
                                <p className="text-sm font-bold">{km} km</p>
                              </div>
                              <div className="text-center">
                                <p className="text-[10px] text-[#9B9B95] mb-0.5">Tid</p>
                                <p className="text-sm font-bold">{duration}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-[10px] text-[#9B9B95] mb-0.5">Fart</p>
                                <p className="text-sm font-bold">{pace}/km</p>
                              </div>
                              {elevGain > 0 && (
                                <div className="text-center">
                                  <p className="text-[10px] text-[#9B9B95] mb-0.5">Høydemeter</p>
                                  <p className="text-sm font-bold">{Math.round(elevGain)} m</p>
                                </div>
                              )}
                              {maxSpeed && (
                                <div className="text-center">
                                  <p className="text-[10px] text-[#9B9B95] mb-0.5">Topphastighet</p>
                                  <p className="text-sm font-bold">{maxSpeed} km/t</p>
                                </div>
                              )}
                              {avgHr && (
                                <div className="text-center">
                                  <p className="text-[10px] text-[#9B9B95] mb-0.5">Snitt-puls</p>
                                  <p className="text-sm font-bold flex items-center justify-center gap-0.5">
                                    <Heart size={11} className="text-red-400" />
                                    {Math.round(avgHr)}
                                  </p>
                                </div>
                              )}
                              {maxHr && (
                                <div className="text-center">
                                  <p className="text-[10px] text-[#9B9B95] mb-0.5">Maks-puls</p>
                                  <p className="text-sm font-bold flex items-center justify-center gap-0.5">
                                    <Heart size={11} className="text-red-600" />
                                    {Math.round(maxHr)}
                                  </p>
                                </div>
                              )}

                            </div>
                            {run.id && (
                              <a
                                href={`https://www.strava.com/activities/${run.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-[#FC5200] hover:underline"
                              >
                                <StravaIcon />
                                Se på Strava
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── STATISTIKK TAB ── */}
        {activeTab === "statistikk" && (
          <div className="space-y-5">
            {!hasRuns ? (
              <EmptyRunsBanner
                onSync={handleSync}
                isSyncing={isSyncing}
                athleteId={athlete?.id}
              />
            ) : (
              <>
                {/* Personal bests */}
                <div className="bg-white border border-[#E5E5E2] rounded-2xl p-4 hover:border-[#C8C8C4] transition-colors">
                  <div className="flex items-center gap-2 mb-4">
                    <Trophy size={14} className="text-[#FC5200]" />
                    <h3 className="text-sm font-bold text-[#111110]">Personlige rekorder</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      { label: "5 km", key: "fiveKm" as const },
                      { label: "10 km", key: "tenKm" as const },
                    ] as { label: string; key: keyof typeof personalBests }[]).map(({ label, key }) => {
                      const pr = personalBests[key] as { time: number; date: string } | null;
                      return (
                        <div key={key} className="bg-[#F8F8F7] rounded-xl p-3">
                          <p className="text-[10px] text-[#9B9B95] mb-1">{label}</p>
                          {pr ? (
                            <>
                              <p className="text-sm font-bold tabular-nums">{formatPRTime(pr.time)}</p>
                              <p className="text-[10px] text-[#6B6B65] mt-0.5">{formatDate(pr.date)}</p>
                            </>
                          ) : (
                            <p className="text-sm font-semibold text-[#C8C8C4]">—</p>
                          )}
                        </div>
                      );
                    })}
                    <div className="bg-[#F8F8F7] rounded-xl p-3">
                      <p className="text-[10px] text-[#9B9B95] mb-1">Lengste løp</p>
                      {personalBests.longestKm > 0 ? (
                        <p className="text-sm font-bold tabular-nums">{personalBests.longestKm.toFixed(1)} km</p>
                      ) : (
                        <p className="text-sm font-semibold text-[#C8C8C4]">—</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Pace trend */}
                <div className="bg-white border border-[#E5E5E2] rounded-2xl p-4 hover:border-[#C8C8C4] transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-[#111110]">Fartsutvikling</h3>
                    <span className="text-xs text-[#6B6B65]">Siste 10 løp</span>
                  </div>
                  <PaceTrendChart runs={recentRuns} />
                </div>

                {/* Zone distribution */}
                <div className="bg-white border border-[#E5E5E2] rounded-2xl p-4 hover:border-[#C8C8C4] transition-colors">
                  <ZoneDistributionChart runs={recentRuns} avgPaceSecPerKm={avgPaceSecPerKm} />
                </div>

                {/* All-time stats */}
                <div className="bg-white border border-[#E5E5E2] rounded-2xl p-4 hover:border-[#C8C8C4] transition-colors">
                  <h3 className="text-sm font-bold text-[#111110] mb-4">Totaloversikt</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#F8F8F7] rounded-xl p-3">
                      <p className="text-[10px] text-[#9B9B95] mb-1">Totale løp</p>
                      <p className="text-lg font-black tabular-nums">{computed.totalRunsAllTime}</p>
                    </div>
                    <div className="bg-[#F8F8F7] rounded-xl p-3">
                      <p className="text-[10px] text-[#9B9B95] mb-1">Total distanse</p>
                      <p className="text-lg font-black tabular-nums">{Math.round(computed.totalKmAllTime)} <span className="text-xs font-medium text-[#6B6B65]">km</span></p>
                    </div>
                    <div className="bg-[#F8F8F7] rounded-xl p-3">
                      <p className="text-[10px] text-[#9B9B95] mb-1">År til dato</p>
                      <p className="text-lg font-black tabular-nums">{Math.round(computed.ytdKm)} <span className="text-xs font-medium text-[#6B6B65]">km</span></p>
                    </div>
                    <div className="bg-[#F8F8F7] rounded-xl p-3">
                      <p className="text-[10px] text-[#9B9B95] mb-1">Lengste løp</p>
                      <p className="text-lg font-black tabular-nums">{computed.longestRunKm.toFixed(1)} <span className="text-xs font-medium text-[#6B6B65]">km</span></p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
