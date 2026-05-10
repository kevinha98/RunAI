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

/**
 * Computes the pace trend for the most recent run compared to
 * the average of the 5 preceding runs.
 *
 * @param runs - StravaActivity array, expected sorted newest-first.
 * @returns difference in sec/km: negative = faster (better), positive = slower (worse).
 *          Returns NaN if there are fewer than 2 runs or data is insufficient.
 */
function computePaceTrend(runs: StravaActivity[]): number {
  if (runs.length < 2) return NaN;

  const latestPace = activityPaceSec(runs[0]);
  if (!latestPace) return NaN;

  const preceding = runs.slice(1, 6).filter((r) => activityPaceSec(r) > 0);
  if (preceding.length === 0) return NaN;

  const avgPace =
    preceding.reduce((sum, r) => sum + activityPaceSec(r), 0) / preceding.length;

  return latestPace - avgPace; // negative = faster (better), positive = slower (worse)
}

// ── PaceTrendBadge ───────────────────────────────────────────────────────────

function PaceTrendBadge({ runs }: { runs: StravaActivity[] }) {
  const diff = useMemo(() => computePaceTrend(runs), [runs]);

  if (isNaN(diff)) return null;

  const THRESHOLD = 5; // seconds/km — within ±5 sec is considered "equal"

  if (diff < -THRESHOLD) {
    return (
      <span
        className="inline-flex items-center gap-0.5 rounded-full bg-green-100 px-1.5 py-0.5 text-xs font-semibold text-green-700 border border-green-300"
        title={`${Math.abs(Math.round(diff))}s/km raskere enn snitt av siste 5 løp`}
      >
        <TrendingUp className="h-3 w-3" />
        <span>{Math.abs(Math.round(diff))}s</span>
      </span>
    );
  }

  if (diff > THRESHOLD) {
    return (
      <span
        className="inline-flex items-center gap-0.5 rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-semibold text-red-700 border border-red-300"
        title={`${Math.round(diff)}s/km tregere enn snitt av siste 5 løp`}
      >
        <TrendingDown className="h-3 w-3" />
        <span>{Math.round(diff)}s</span>
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-0.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs font-semibold text-gray-500 border border-gray-300"
      title="Tilsvarende pace som snitt av siste 5 løp"
    >
      <span className="text-[10px] leading-none">=</span>
    </span>
  );
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

// ── Streak & konsistens-hjelpefunksjoner ────────────────────────────────────

/**
 * Teller antall sammenhengende uker bakover (inkl. inneværende uke)
 * der brukeren har gjennomført minst én løpeøkt.
 */
function computeWeeklyStreak(runs: StravaActivity[]): number {
  if (runs.length === 0) return 0;

  const now = new Date();
  let streak = 0;
  let checkDate = new Date(now);

  for (let i = 0; i < 52; i++) {
    const weekStart = getWeekStart(checkDate);
    const weekEnd = getWeekEnd(checkDate);

    const hasRun = runs.some((r) => {
      const d = new Date(r.start_date_local);
      return d >= weekStart && d <= weekEnd;
    });

    if (!hasRun) break;

    streak++;
    checkDate = new Date(weekStart);
    checkDate.setDate(checkDate.getDate() - 1);
  }

  return streak;
}

/**
 * Returnerer en array på `n` booleans (eldst først) der true = minst én løpeøkt den uken.
 * Siste element = inneværende uke.
 */
function computeConsistencyGrid(runs: StravaActivity[], n = 8): boolean[] {
  const result: boolean[] = [];
  const now = new Date();

  for (let i = n - 1; i >= 0; i--) {
    const refDate = new Date(now);
    refDate.setDate(now.getDate() - i * 7);
    const weekStart = getWeekStart(refDate);
    const weekEnd = getWeekEnd(refDate);

    const hasRun = runs.some((r) => {
      const d = new Date(r.start_date_local);
      return d >= weekStart && d <= weekEnd;
    });

    result.push(hasRun);
  }

  return result;
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

// ── StreakIndicator-komponent ────────────────────────────────────────────────

function StreakIndicator({ recentRuns }: { recentRuns: StravaActivity[] }) {
  const streak = useMemo(() => computeWeeklyStreak(recentRuns), [recentRuns]);
  const grid = useMemo(() => computeConsistencyGrid(recentRuns, 8), [recentRuns]);

  const badgeLabel =
    streak >= 8 ? "Eliteform 🏆" :
    streak >= 6 ? "På rull! 💪" :
    streak >= 4 ? "Bra jobba!" :
    null;

  const motivationText =
    streak === 0
      ? "Kom i gang – logg en økt denne uken!"
      : streak < 3
      ? "Bra start! Hold det gående mot maratonstart."
      : streak < 6
      ? "Solid konsistens! Du bygger et sterkt grunnlag."
      : "Imponerende streak! Du er i maratonform 🏅";

  return (
    <div className="bg-white border border-[#E5E5E2] rounded-2xl p-4 mb-5 hover:border-[#C8C8C4] transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl" aria-label="treningsstreak ildikon">🔥</span>
          <div>
            <p className="text-[10px] text-[#6B6B65] font-medium uppercase tracking-wide leading-none mb-0.5">
              Treningsstreak
            </p>
            <p className="text-2xl font-black text-[#111110] leading-tight tabular-nums">
              {streak}
              <span className="text-sm font-medium text-[#6B6B65] ml-1">
                {streak === 1 ? "uke" : "uker"}
              </span>
            </p>
          </div>
        </div>
        {badgeLabel && (
          <span className="text-xs font-semibold bg-orange-50 text-[#FC5200] border border-orange-200 rounded-full px-2.5 py-0.5">
            {badgeLabel}
          </span>
        )}
      </div>

      {/* Motivasjonstekst */}
      <p className="text-xs text-[#6B6B65] mb-3">{motivationText}</p>

      {/* 8-ukers konsistensrad */}
      <div>
        <p className="text-[10px] text-[#9B9B95] mb-2">Siste 8 uker</p>
        <div className="flex items-center gap-1.5">
          {grid.map((active, i) => {
            const isCurrentWeek = i === grid.length - 1;
            return (
              <div
                key={i}
                title={active ? `Uke ${i + 1}: Økt gjennomført ✓` : `Uke ${i + 1}: Ingen økt`}
                className={`rounded-full transition-all duration-200 ${
                  active
                    ? isCurrentWeek
                      ? "bg-[#FC5200] ring-2 ring-[#FC5200] ring-offset-1"
                      : "bg-emerald-500"
                    : "bg-[#E5E5E2]"
                }`}
                style={{ width: "20px", height: "20px", flexShrink: 0 }}
              />
            );
          })}
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[9px] text-[#9B9B95]">8 uker siden</span>
          <span className="text-[9px] text-[#9B9B95]">Nå</span>
        </div>
      </div>

      {/* Forklaring */}
      <div className="flex items-center gap-3 mt-2.5 pt-2.5 border-t border-[#F0F0EE]">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-[9px] text-[#9B9B95]">Økt gjennomført</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-[#FC5200]" />
          <span className="text-[9px] text-[#9B9B95]">Inneværende uke</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-[#E5E5E2]" />
          <span className="text-[9px] text-[#9B9B95]">Ingen økt</span>
        </div>
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
    <div className="bg-white border border-[#E5E5E2] rounded-2xl p-4 flex flex-col gap-1 hover:border-[#C8C8C4] transition-colors">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[#6B6B65]">{icon}</span>
        <span className="text-xs font-medium text-[#6B6B65] uppercase tracking-wide">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-black text-[#111110] tabular-nums">{value}</span>
        <span className="text-sm text-[#6B6B65] font-medium">{unit}</span>
      </div>
      <span className={`text-xs ${subColor}`}>{sub}</span>
    </div>
  );
}

function WeekProgressBar({ actual, plan }: { actual: number; plan: number }) {
  const pct = plan > 0 ? Math.min(100, (actual / plan) * 100) : 0;
  const color = pct >= 100 ? "bg-emerald-500" : pct >= 60 ? "bg-[#FC5200]" : "bg-amber-400";
  return (
    <div className="mt-1">
      <div className="flex justify-between text-xs text-[#6B6B65] mb-1">
        <span>{actual.toFixed(1)} km gjennomført</span>
        <span>Mål: {plan} km</span>
      </div>
      <div className="w-full bg-[#F0F0EE] rounded-full h-2">
        <div
          className={`${color} h-2 rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-base font-bold text-[#111110]">{title}</h2>
      {subtitle && <span className="text-xs text-[#6B6B65]">{subtitle}</span>}
    </div>
  );
}

// Main component

export default function DashboardClient({
  stravaData,
  stravaStatus,
}: {
  stravaData: StoredStats;
  stravaStatus: string | null;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"oversikt" | "aktivitet" | "statistikk">("oversikt");
  const [dismissedBanner, setDismissedBanner] = useState(false);

  const { recentRuns, computed, athlete } = stravaData;

  const planSessions = useMemo(() => getPlanSessions(recentRuns), [recentRuns]);
  const weeklyBuckets = useMemo(() => weeklyKmBuckets(recentRuns, 8), [recentRuns]);
  const marathonProgress = useMemo(() => getMarathonProgress(), []);
  const personalBests = useMemo(() => computePersonalBests(recentRuns), [recentRuns]);

  const weeklyActual = useMemo(() => getWeeklyActualKm(recentRuns), [recentRuns]);
  const weeklyPlan = useMemo(() => getWeeklyPlanKm(), []);

  const syncAge = useMemo(() => {
    if (!stravaData.lastSync) return null;
    const diff = Date.now() - new Date(stravaData.lastSync).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Nå nettopp";
    if (mins < 60) return `${mins} min siden`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}t siden`;
    return `${Math.floor(hrs / 24)}d siden`;
  }, [stravaData.lastSync]);

  const isSyncFresh = useMemo(() => {
    if (!stravaData.lastSync) return false;
    return Date.now() - new Date(stravaData.lastSync).getTime() < 5 * 60 * 1000;
  }, [stravaData.lastSync]);

  const handleSync = useCallback(() => {
    router.push("/api/strava/sync?redirect=/dashboard?strava=synced");
  }, [router]);

  // Show strava status banner
  const showBanner = !dismissedBanner && !!stravaStatus;
  const bannerText =
    stravaStatus === "connected"
      ? "✅ Strava koblet til! Data synkroniseres nå."
      : stravaStatus === "synced"
      ? "🔄 Strava-data oppdatert!"
      : stravaStatus === "error"
      ? "❌ Kunne ikke koble til Strava. Prøv igjen."
      : null;

  useEffect(() => {
    if (stravaStatus) setDismissedBanner(false);
  }, [stravaStatus]);

  const recentActivities = stravaData.recentActivities.slice(0, 8);

  return (
    <main className="flex-1 min-h-screen overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-6">

        {/* Banner */}
        {showBanner && bannerText && (
          <div className="mb-4 flex items-center justify-between bg-white border border-[#E5E5E2] rounded-xl px-4 py-3 text-sm text-[#111110]">
            <span>{bannerText}</span>
            <button
              onClick={() => setDismissedBanner(true)}
              className="ml-4 text-[#6B6B65] hover:text-[#111110] text-lg leading-none"
              aria-label="Lukk"
            >
              ×
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-[#111110]">
              {athlete?.firstname ? `Hei, ${athlete.firstname} 👋` : "Dashboard"}
            </h1>
            <p className="text-sm text-[#6B6B65] mt-0.5">
              Bergen City Marathon · {RACE_DATE}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {syncAge && (
              <div className="flex items-center gap-1.5 text-xs text-[#6B6B65]">
                {isSyncFresh && <SyncFreshDot />}
                <span>{syncAge}</span>
              </div>
            )}
            <button
              onClick={handleSync}
              className="flex items-center gap-1.5 bg-[#FC5200] hover:bg-[#e04a00] text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              <Zap size={12} />
              Synk
            </button>
          </div>
        </div>

        {/* Marathon progress */}
        <div className="bg-white border border-[#E5E5E2] rounded-2xl p-4 mb-5 hover:border-[#C8C8C4] transition-colors">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Trophy size={16} className="text-[#FC5200]" />
              <span className="text-sm font-bold text-[#111110]">Maratonmål</span>
            </div>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getPhaseBadgeClass(marathonProgress.currentPhase)}`}>
              {marathonProgress.currentPhase}
            </span>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-black text-[#111110] tabular-nums">{marathonProgress.daysLeft}</span>
            <span className="text-sm text-[#6B6B65]">dager igjen</span>
            <span className="text-xs text-[#9B9B95] ml-auto">{marathonProgress.pct}% fullført</span>
          </div>
          <div className="w-full bg-[#F0F0EE] rounded-full h-2">
            <div
              className="bg-[#FC5200] h-2 rounded-full transition-all duration-700"
              style={{ width: `${marathonProgress.pct}%` }}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 bg-[#F0F0EE] rounded-xl p-1">
          {(["oversikt", "aktivitet", "statistikk"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors capitalize ${
                activeTab === tab
                  ? "bg-white text-[#111110] shadow-sm"
                  : "text-[#6B6B65] hover:text-[#111110]"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab: Oversikt */}
        {activeTab === "oversikt" && (
          <div>
            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <StatCard
                icon={<Activity size={14} />}
                label="Denne uken"
                value={weeklyActual.toFixed(1)}
                unit="km"
                sub={`Mål: ${weeklyPlan} km`}
                subColor={weeklyActual >= weeklyPlan ? "text-emerald-600" : "text-[#6B6B65]"}
              />
              <StatCard
                icon={<Timer size={14} />}
                label="Snittfart"
                value={computed.avgPaceSecPerKm > 0 ? formatPace(computed.avgPaceSecPerKm) : "—"}
                unit="/km"
                sub="Alle løp"
              />
              <StatCard
                icon={<Mountain size={14} />}
                label="Lengste løp"
                value={computed.longestRunKm.toFixed(1)}
                unit="km"
                sub="Noensinne"
              />
              <StatCard
                icon={<BarChart2 size={14} />}
                label="Total distanse"
                value={computed.totalKmAllTime > 1000
                  ? (computed.totalKmAllTime / 1000).toFixed(1)
                  : Math.round(computed.totalKmAllTime).toString()}
                unit={computed.totalKmAllTime > 1000 ? "Kkm" : "km"}
                sub={`${computed.totalRunsAllTime} løp totalt`}
              />
            </div>

            {/* Week progress */}
            <div className="bg-white border border-[#E5E5E2] rounded-2xl p-4 mb-5 hover:border-[#C8C8C4] transition-colors">
              <SectionHeader title="Ukeprogresjon" />
              <WeekProgressBar actual={weeklyActual} plan={weeklyPlan} />
            </div>

            {/* Plan sessions */}
            <div className="bg-white border border-[#E5E5E2] rounded-2xl p-4 mb-5 hover:border-[#C8C8C4] transition-colors">
              <div className="flex items-center justify-between mb-3">
                <SectionHeader title="Denne ukens plan" />
                <Link
                  href="/plan"
                  className="text-xs text-[#FC5200] font-semibold flex items-center gap-0.5 hover:underline -mt-3"
                >
                  Se full plan <ChevronRight size={12} />
                </Link>
              </div>
              <div className="flex flex-col gap-2">
                {planSessions.map((session, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-3 p-2.5 rounded-xl border transition-colors ${
                      session.done
                        ? "bg-emerald-50 border-emerald-200"
                        : "bg-[#FAFAF8] border-[#E5E5E2]"
                    }`}
                  >
                    <span className="text-lg">{session.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[#111110] truncate">{session.type}</p>
                      <p className="text-[10px] text-[#6B6B65]">{session.day} · {session.distance} · {session.pace}</p>
                    </div>
                    {session.done && (
                      <span className="text-xs font-semibold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">✓</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Personal bests */}
            <div className="bg-white border border-[#E5E5E2] rounded-2xl p-4 mb-5 hover:border-[#C8C8C4] transition-colors">
              <SectionHeader title="Personlige rekorder" />
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col items-center bg-[#FAFAF8] rounded-xl p-3 border border-[#E5E5E2]">
                  <span className="text-[10px] text-[#6B6B65] mb-1 font-medium">5 km</span>
                  <span className="text-lg font-black text-[#111110] tabular-nums">
                    {personalBests.fiveKm > 0 ? formatPRTime(personalBests.fiveKm) : "—"}
                  </span>
                  {personalBests.fiveKmDate && (
                    <span className="text-[9px] text-[#9B9B95] mt-0.5">{formatDate(personalBests.fiveKmDate)}</span>
                  )}
                </div>
                <div className="flex flex-col items-center bg-[#FAFAF8] rounded-xl p-3 border border-[#E5E5E2]">
                  <span className="text-[10px] text-[#6B6B65] mb-1 font-medium">10 km</span>
                  <span className="text-lg font-black text-[#111110] tabular-nums">
                    {personalBests.tenKm > 0 ? formatPRTime(personalBests.tenKm) : "—"}
                  </span>
                  {personalBests.tenKmDate && (
                    <span className="text-[9px] text-[#9B9B95] mt-0.5">{formatDate(personalBests.tenKmDate)}</span>
                  )}
                </div>
                <div className="flex flex-col items-center bg-[#FAFAF8] rounded-xl p-3 border border-[#E5E5E2]">
                  <span className="text-[10px] text-[#6B6B65] mb-1 font-medium">Lengst</span>
                  <span className="text-lg font-black text-[#111110] tabular-nums">
                    {personalBests.longestKm > 0 ? `${personalBests.longestKm.toFixed(1)} km` : "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* AI Coach CTA */}
            <div className="bg-gradient-to-br from-[#FC5200] to-[#e04a00] rounded-2xl p-4 mb-5">
              <div className="flex items-center gap-3">
                <Brain size={24} className="text-white flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-white font-bold text-sm">AI-trener</p>
                  <p className="text-white/80 text-xs">Få personlig treningsveiledning</p>
                </div>
                <Link
                  href="/coach"
                  className="flex items-center gap-1 bg-white text-[#FC5200] text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-orange-50 transition-colors"
                >
                  <MessageCircle size={12} />
                  Chat
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Aktivitet */}
        {activeTab === "aktivitet" && (
          <div>
            <ActivityCalendar runs={recentRuns} />
            <StreakIndicator recentRuns={recentRuns} />

            {/* Recent activities list */}
            <div className="bg-white border border-[#E5E5E2] rounded-2xl p-4 mb-5">
              <SectionHeader title="Siste aktiviteter" subtitle={`${recentActivities.length} aktiviteter`} />
              {recentActivities.length === 0 ? (
                <div className="text-center py-8">
                  <Play size={32} className="text-[#E5E5E2] mx-auto mb-2" />
                  <p className="text-sm text-[#6B6B65]">Ingen aktiviteter ennå</p>
                  <button
                    onClick={handleSync}
                    className="mt-3 text-xs text-[#FC5200] font-semibold hover:underline"
                  >
                    Synk med Strava
                  </button>
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-[#F0F0EE]">
                  {recentActivities.map((activity, idx) => {
                    const isRun = activity.type === "Run" || activity.type === "VirtualRun";
                    const isLatestRun = idx === 0 && isRun;
                    return (
                      <div key={activity.id} className="py-3 first:pt-0 last:pb-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-base flex-shrink-0">
                              {activity.type === "Run" || activity.type === "VirtualRun" ? "🏃" :
                               activity.type === "Ride" ? "🚴" :
                               activity.type === "Swim" ? "🏊" : "⚡"}
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-[#111110] truncate">{activity.name}</p>
                              <p className="text-[10px] text-[#9B9B95]">{formatDate(activity.start_date_local)}</p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <span className="text-xs font-bold text-[#111110] tabular-nums">
                              {metersToKm(activity.distance)} km
                            </span>
                            <span className="text-[10px] text-[#6B6B65]">
                              {formatMovingTime(activity.moving_time)}
                            </span>
                          </div>
                        </div>
                        {isRun && (
                          <div className="flex items-center gap-3 mt-1.5 pl-7">
                            <div className="flex items-center gap-1">
                              <Timer size={10} className="text-[#9B9B95]" />
                              <span className="text-[10px] text-[#6B6B65]">{activityPace(activity)}/km</span>
                              {isLatestRun && (
                                <PaceTrendBadge runs={recentRuns} />
                              )}
                            </div>
                            {activity.total_elevation_gain > 0 && (
                              <div className="flex items-center gap-1">
                                <Mountain size={10} className="text-[#9B9B95]" />
                                <span className="text-[10px] text-[#6B6B65]">{Math.round(activity.total_elevation_gain)}m</span>
                              </div>
                            )}
                            {activity.average_heartrate && (
                              <div className="flex items-center gap-1">
                                <Heart size={10} className="text-[#9B9B95]" />
                                <span className="text-[10px] text-[#6B6B65]">{Math.round(activity.average_heartrate)} bpm</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: Statistikk */}
        {activeTab === "statistikk" && (
          <div>
            {/* Weekly km chart */}
            <div className="bg-white border border-[#E5E5E2] rounded-2xl p-4 mb-5 hover:border-[#C8C8C4] transition-colors">
              <SectionHeader title="Ukentlig distanse" subtitle="Siste 8 uker" />
              {weeklyBuckets.length > 0 ? (
                <BarChart
                  data={weeklyBuckets.map((b) => ({ label: b.label, value: b.km }))}
                />
              ) : (
                <p className="text-xs text-[#6B6B65]">Ingen data ennå</p>
              )}
            </div>

            {/* Pace trend chart */}
            <div className="bg-white border border-[#E5E5E2] rounded-2xl p-4 mb-5 hover:border-[#C8C8C4] transition-colors">
              <SectionHeader title="Pacetrender" subtitle="Siste 10 løp" />
              <PaceTrendChart runs={recentRuns} />
            </div>

            {/* Zone distribution */}
            <div className="bg-white border border-[#E5E5E2] rounded-2xl p-4 mb-5 hover:border-[#C8C8C4] transition-colors">
              <ZoneDistributionChart
                runs={recentRuns}
                avgPaceSecPerKm={computed.avgPaceSecPerKm}
              />
            </div>

            {/* YTD stats */}
            <div className="bg-white border border-[#E5E5E2] rounded-2xl p-4 mb-5 hover:border-[#C8C8C4] transition-colors">
              <SectionHeader title="År til dato" />
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#FAFAF8] rounded-xl p-3 border border-[#E5E5E2]">
                  <p className="text-[10px] text-[#6B6B65] mb-1">Distanse</p>
                  <p className="text-xl font-black text-[#111110] tabular-nums">{Math.round(computed.ytdKm)} <span className="text-sm font-medium text-[#6B6B65]">km</span></p>
                </div>
                <div className="bg-[#FAFAF8] rounded-xl p-3 border border-[#E5E5E2]">
                  <p className="text-[10px] text-[#6B6B65] mb-1">Løp</p>
                  <p className="text-xl font-black text-[#111110] tabular-nums">{computed.weeklyRuns * 52} <span className="text-sm font-medium text-[#6B6B65]">est.</span></p>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
