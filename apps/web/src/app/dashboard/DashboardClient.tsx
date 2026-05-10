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
  X,
} from "lucide-react";
import type { StoredStats, StravaActivity } from "@/lib/strava-types";
import { formatPace, computePaceZoneDistribution, computePersonalBests } from "@/lib/strava-types";
import { getCurrentWeek, WEEKS, PLAN_START, RACE_DATE as RACE_DATE_OBJ } from "@/lib/plan-data";
import type { Phase, Week } from "@/lib/plan-data";

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

// ── Pace trend helpers ───────────────────────────────────────────────────────

/**
 * Computes the pace trend for the most recent run compared to the
 * average pace of the 5 preceding runs.
 */
function computePaceTrend(runs: StravaActivity[]): number {
  const validRuns = runs
    .filter((r) => r.distance > 0 && r.moving_time > 0)
    .slice()
    .sort(
      (a, b) =>
        new Date(b.start_date_local).getTime() -
        new Date(a.start_date_local).getTime()
    );

  if (validRuns.length < 2) return 0;

  const latestRun = validRuns[0];
  const previousRuns = validRuns.slice(1, 6);

  if (previousRuns.length === 0) return 0;

  const latestPaceSec = activityPaceSec(latestRun);
  const avgPrevPaceSec =
    previousRuns.reduce((sum, r) => sum + activityPaceSec(r), 0) /
    previousRuns.length;

  if (avgPrevPaceSec === 0) return 0;

  return latestPaceSec - avgPrevPaceSec;
}

/**
 * Badge that shows pace trend for the most recent run.
 */
function PaceTrendBadge({ runs }: { runs: StravaActivity[] }) {
  const diff = useMemo(() => computePaceTrend(runs), [runs]);
  const THRESHOLD = 5;

  if (diff < -THRESHOLD) {
    return (
      <span
        className="inline-flex items-center gap-0.5 rounded-full bg-green-100 px-1.5 py-0.5 text-xs font-semibold text-green-700 border border-green-300"
        title={`${Math.abs(diff).toFixed(0)}s/km raskere enn snitt av forrige 5 løp`}
      >
        <TrendingUp className="h-3 w-3" />
        <span>+</span>
      </span>
    );
  }

  if (diff > THRESHOLD) {
    return (
      <span
        className="inline-flex items-center gap-0.5 rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-semibold text-red-700 border border-red-300"
        title={`${diff.toFixed(0)}s/km tregere enn snitt av forrige 5 løp`}
      >
        <TrendingDown className="h-3 w-3" />
        <span>-</span>
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-0.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs font-semibold text-gray-500 border border-gray-300"
      title="Lik pace som snitt av forrige 5 løp"
    >
      <span>=</span>
    </span>
  );
}

// ── Aktivitetskalender-hjelpefunksjoner ──────────────────────────────────────

function buildActivityHeatmap(runs: StravaActivity[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const run of runs) {
    const dateStr = new Date(run.start_date_local).toLocaleDateString("sv-SE");
    map.set(dateStr, (map.get(dateStr) ?? 0) + run.distance / 1000);
  }
  return map;
}

function getDayColor(km: number): string {
  if (km <= 0) return "bg-white border border-gray-200";
  if (km < 5)  return "bg-green-200";
  if (km <= 10) return "bg-green-500";
  return "bg-green-800";
}

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

// ── Phase Completion helpers ─────────────────────────────────────────────────

/**
 * Returns all weeks belonging to the same phase as the given phase.
 */
function getPhaseWeeks(phase: Phase): Week[] {
  return WEEKS.filter((w) => w.phase === phase);
}

/**
 * Checks if a specific plan week (identified by its week number) is considered completed.
 */
function isWeekCompleted(
  week: Week,
  currentWeekNum: number,
  recentRuns: StravaActivity[]
): boolean {
  if (week.week < currentWeekNum) {
    return true;
  }
  if (week.week > currentWeekNum) {
    return false;
  }
  // Current week: check running sessions only
  const runningSessions = week.sessions.filter(
    (s) => s.type !== "Hvile" && s.type !== "Mobilitet" && s.type !== "Styrke"
  );
  if (runningSessions.length === 0) return true;
  return runningSessions.every((s) => isSessionDone(s.day, recentRuns));
}

interface PhaseCompletionStats {
  phase: Phase;
  completedWeeks: number;
  totalWeeks: number;
  percentage: number;
}

/**
 * Computes how many weeks in the current phase have been completed.
 */
function getPhaseCompletionStats(
  recentRuns: StravaActivity[]
): PhaseCompletionStats {
  const currentWeekNum = getCurrentWeek();
  const weekData = WEEKS.find((w) => w.week === currentWeekNum) ?? WEEKS[0];
  const currentPhase = weekData.phase;

  const phaseWeeks = getPhaseWeeks(currentPhase);
  const totalWeeks = phaseWeeks.length;

  // Only count weeks that have started (week <= currentWeekNum)
  const startedWeeks = phaseWeeks.filter((w) => w.week <= currentWeekNum);
  const completedWeeks = startedWeeks.filter((w) =>
    isWeekCompleted(w, currentWeekNum, recentRuns)
  ).length;

  const percentage =
    totalWeeks > 0 ? Math.round((completedWeeks / totalWeeks) * 100) : 0;

  return { phase: currentPhase, completedWeeks, totalWeeks, percentage };
}

/**
 * Compact badge/pill shown at the top of the weekly plan.
 */
function PhaseCompletionBadge({ recentRuns }: { recentRuns: StravaActivity[] }) {
  const stats = useMemo(() => getPhaseCompletionStats(recentRuns), [recentRuns]);

  const { phase, completedWeeks, totalWeeks, percentage } = stats;

  const progressColor =
    percentage >= 80
      ? "bg-emerald-500"
      : percentage >= 50
      ? "bg-blue-500"
      : percentage >= 25
      ? "bg-amber-500"
      : "bg-gray-400";

  const badgeClass = getPhaseBadgeClass(phase);

  return (
    <div className="flex items-center gap-2 mb-3 flex-wrap">
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${badgeClass}`}
        title={`${completedWeeks} av ${totalWeeks} uker fullført i ${phase}-fasen`}
      >
        <span>📅</span>
        <span>
          {completedWeeks} av {totalWeeks} uker fullført i {phase} ({percentage}%)
        </span>
      </span>
      {/* Mini progress bar */}
      <div className="flex-1 min-w-16 max-w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// ── ActivityCalendar-komponent ────────────────────────────────────────────────

function ActivityCalendar({ runs }: { runs: StravaActivity[] }) {
  const heatmap = useMemo(() => buildActivityHeatmap(runs), [runs]);
  const days = useMemo(() => getLast8WeeksDays(), []);
  const todayStr = useMemo(() => new Date().toLocaleDateString("sv-SE"), []);

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

      <p className="text-xs text-[#6B6B65] mb-3">{motivationText}</p>

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
                    {dateLabel} · {distKm} km
                  </text>
                  <text x={tx + TOOLTIP_W / 2} y={ty + 30} textAnchor="middle" fontSize={12} fontWeight="bold" fill={STRAVA_ORANGE}>
                    {paceLabel}
                  </text>
                  <text x={tx + TOOLTIP_W / 2} y={ty + 44} textAnchor="middle" fontSize={8} fill="#9B9B95">
                    min/km
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Målpace-konstanter og hjelpefunksjoner ──────────────────────────────────

/** Target pace for sub-3:30 Bergen City Marathon: 5:00/km = 300 sek/km */
const TARGET_PACE_SEC_PER_KM = 300;
const TARGET_PACE_LABEL = "5:00/km";
const TARGET_RACE_LABEL = "Sub-3:30 Bergen City Marathon";
/** Max antall sekunder bak mål som fortsatt gir >0% progress */
const MAX_DELTA_SEC = 60;

interface PaceProgressResult {
  currentPaceSec: number;
  diffSec: number;
  progressPct: number;
  colorClass: string;
  barColorClass: string;
  badgeBgClass: string;
  diffLabel: string;
  onTarget: boolean;
}

/**
 * Beregner fremgang mot målpace (TARGET_PACE_SEC_PER_KM).
 * - progressPct: 100 når pace <= mål, 0 når pace >= mål + MAX_DELTA_SEC
 * - diffSec: positivt = tregere enn mål, negativt = raskere enn mål
 */
function computeTargetPaceProgress(avgPaceSecPerKm: number): PaceProgressResult {
  const diff = avgPaceSecPerKm - TARGET_PACE_SEC_PER_KM;

  const progressPct =
    diff <= 0
      ? 100
      : Math.max(0, Math.round(((MAX_DELTA_SEC - diff) / MAX_DELTA_SEC) * 100));

  let colorClass: string;
  let barColorClass: string;
  let badgeBgClass: string;

  if (diff <= 0) {
    colorClass = "text-green-600";
    barColorClass = "bg-green-500";
    badgeBgClass = "bg-green-100 text-green-700 border-green-300";
  } else if (diff <= 15) {
    colorClass = "text-yellow-600";
    barColorClass = "bg-yellow-400";
    badgeBgClass = "bg-yellow-100 text-yellow-700 border-yellow-300";
  } else {
    colorClass = "text-red-600";
    barColorClass = "bg-red-500";
    badgeBgClass = "bg-red-100 text-red-700 border-red-300";
  }

  const absDiff = Math.abs(Math.round(diff));
  const sign = diff > 0 ? "+" : diff < 0 ? "-" : "";
  const diffLabel = `${sign}${absDiff}s/km`;

  return {
    currentPaceSec: avgPaceSecPerKm,
    diffSec: diff,
    progressPct,
    colorClass,
    barColorClass,
    badgeBgClass,
    diffLabel,
    onTarget: diff <= 0,
  };
}

// ── MarathonPaceCard-komponent ───────────────────────────────────────────────

function MarathonPaceCard({ avgPaceSecPerKm }: { avgPaceSecPerKm: number }) {
  const hasData = avgPaceSecPerKm > 0 && isFinite(avgPaceSecPerKm);

  const result = useMemo(
    () => (hasData ? computeTargetPaceProgress(avgPaceSecPerKm) : null),
    [avgPaceSecPerKm, hasData]
  );

  if (!hasData || !result) {
    return (
      <div className="bg-white border border-[#E5E5E2] rounded-2xl p-4 mb-5 hover:border-[#C8C8C4] transition-colors">
        <div className="flex items-center gap-2 mb-2">
          <Trophy className="w-4 h-4 text-yellow-500 shrink-0" />
          <h3 className="text-sm font-bold text-[#111110]">Fremgang mot målpace</h3>
        </div>
        <p className="text-xs text-[#9B9B95] italic">Ikke nok løpedata ennå. Logg noen løp for å se fremgang.</p>
      </div>
    );
  }

  const {
    progressPct,
    colorClass,
    barColorClass,
    badgeBgClass,
    diffLabel,
    onTarget,
    diffSec,
  } = result;

  const currentPaceLabel = formatPace(avgPaceSecPerKm);

  const statusText = onTarget
    ? diffSec < 0
      ? `${Math.abs(Math.round(diffSec))} sek/km foran mål 🎉`
      : "Akkurat på mål! ✓"
    : diffSec <= 15
    ? `Nesten der – bare ${Math.round(diffSec)} sek/km igjen`
    : `${Math.round(diffSec)} sek/km bak målpace`;

  return (
    <div className="bg-white border border-[#E5E5E2] rounded-2xl p-4 mb-5 hover:border-[#C8C8C4] transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-500 shrink-0" />
          <h3 className="text-sm font-bold text-[#111110]">Fremgang mot målpace</h3>
        </div>
        <span className="text-[10px] text-[#9B9B95] font-medium">Bergen City Marathon</span>
      </div>

      {/* Pace-verdier */}
      <div className="flex items-end justify-between mb-3">
        <div>
          <p className="text-[10px] text-[#9B9B95] uppercase tracking-wide mb-0.5">Din snittspace</p>
          <p className={`text-2xl font-black tabular-nums leading-tight ${colorClass}`}>
            {currentPaceLabel}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-[#9B9B95] uppercase tracking-wide mb-0.5">Målpace</p>
          <p className="text-2xl font-black tabular-nums leading-tight text-[#111110]">
            {TARGET_PACE_LABEL}
          </p>
          <p className="text-[10px] text-[#9B9B95]">{TARGET_RACE_LABEL}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-[#9B9B95]">Fremgang</span>
          <span className="text-[10px] font-semibold text-[#111110]">{progressPct}%</span>
        </div>
        <div className="h-2.5 bg-[#F0F0EE] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${barColorClass}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Differanse-badge og statusmelding */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-[#6B6B65]">{statusText}</span>
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${badgeBgClass}`}
          title={`Differanse mot målpace: ${diffLabel}`}
        >
          {onTarget ? (
            <TrendingDown className="w-3 h-3" />
          ) : (
            <TrendingUp className="w-3 h-3" />
          )}
          {diffLabel}
        </span>
      </div>
    </div>
  );
}

// ── DashboardClient ──────────────────────────────────────────────────────────

export default function DashboardClient({
  stravaData,
  stravaStatus,
}: {
  stravaData: StoredStats;
  stravaStatus: string | null;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"oversikt" | "okter" | "statistikk">("oversikt");
  const [showAICoach, setShowAICoach] = useState(false);
  const [aiMessages, setAIMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [aiInput, setAIInput] = useState("");
  const [aiLoading, setAILoading] = useState(false);
  const [dismissedStatus, setDismissedStatus] = useState(false);

  const recentRuns = stravaData.recentRuns ?? [];
  const allActivities = stravaData.recentActivities ?? [];
  const computed = stravaData.computed;
  const athlete = stravaData.athlete;
  const personalBests = useMemo(() => computePersonalBests(recentRuns), [recentRuns]);

  const planSessions = useMemo(() => getPlanSessions(recentRuns), [recentRuns]);
  const { daysLeft, currentPhase, pct: marathonPct } = useMemo(() => getMarathonProgress(), []);

  const weeklyBuckets = useMemo(() => weeklyKmBuckets(recentRuns, 8), [recentRuns]);
  const chartData = useMemo(
    () => weeklyBuckets.map((b) => ({ label: b.label, value: Math.round(b.km) })),
    [weeklyBuckets]
  );

  const weeklyActualKm = useMemo(() => getWeeklyActualKm(recentRuns), [recentRuns]);
  const weeklyPlanKm = useMemo(() => getWeeklyPlanKm(), []);

  const paceZones = useMemo(
    () => computePaceZoneDistribution(recentRuns, computed.avgPaceSecPerKm, 10),
    [recentRuns, computed.avgPaceSecPerKm]
  );

  const sendAIMessage = useCallback(async () => {
    if (!aiInput.trim() || aiLoading) return;
    const userMsg = aiInput.trim();
    setAIInput("");
    setAIMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setAILoading(true);
    try {
      const res = await fetch("/api/ai-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, stravaData }),
      });
      const data = await res.json();
      setAIMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply ?? "Ingen respons" },
      ]);
    } catch {
      setAIMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Beklager, noe gikk galt. Prøv igjen." },
      ]);
    } finally {
      setAILoading(false);
    }
  }, [aiInput, aiLoading, stravaData]);

  const lastSyncLabel = useMemo(() => {
    if (!stravaData.lastSync) return null;
    const d = new Date(stravaData.lastSync);
    const now = new Date();
    const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (diffMin < 1) return "Nettopp synkronisert";
    if (diffMin < 60) return `Synkronisert ${diffMin} min siden`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `Synkronisert ${diffH}t siden`;
    return `Synkronisert ${d.toLocaleDateString("nb-NO", { day: "numeric", month: "short" })}`;
  }, [stravaData.lastSync]);

  const isSyncFresh = useMemo(() => {
    if (!stravaData.lastSync) return false;
    const diffMin = Math.floor((Date.now() - new Date(stravaData.lastSync).getTime()) / 60000);
    return diffMin < 10;
  }, [stravaData.lastSync]);

  // Strava connect status banner
  const showStravaStatus = !dismissedStatus && stravaStatus;

  return (
    <main className="flex-1 min-h-screen bg-[#F5F5F3] flex flex-col">
      {/* Strava status banner */}
      {showStravaStatus && (
        <div
          className={`flex items-center justify-between gap-3 px-4 py-2.5 text-sm font-medium ${
            stravaStatus === "connected"
              ? "bg-green-50 text-green-800 border-b border-green-200"
              : stravaStatus === "error"
              ? "bg-red-50 text-red-800 border-b border-red-200"
              : "bg-blue-50 text-blue-800 border-b border-blue-200"
          }`}
        >
          <span>
            {stravaStatus === "connected"
              ? "✓ Strava-konto koblet til! Data synkroniseres automatisk."
              : stravaStatus === "error"
              ? "✗ Noe gikk galt ved tilkobling av Strava. Prøv igjen."
              : `Strava: ${stravaStatus}`}
          </span>
          <button
            onClick={() => setDismissedStatus(true)}
            className="p-0.5 rounded hover:bg-black/10 transition-colors"
            aria-label="Lukk melding"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top bar */}
      <header className="flex items-center justify-between px-4 sm:px-6 pt-5 pb-3">
        <div>
          <h1 className="text-xl font-black text-[#111110] leading-tight">
            {athlete?.firstname ? `Hei, ${athlete.firstname} 👋` : "Dashboard"}
          </h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            {isSyncFresh && <SyncFreshDot />}
            {lastSyncLabel && (
              <p className="text-xs text-[#9B9B95]">{lastSyncLabel}</p>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowAICoach((v) => !v)}
          className="flex items-center gap-1.5 bg-[#111110] text-white rounded-full px-3 py-1.5 text-xs font-semibold hover:bg-[#2C2C2A] transition-colors"
        >
          <Brain className="w-3.5 h-3.5" />
          AI-coach
        </button>
      </header>

      {/* AI Coach panel */}
      {showAICoach && (
        <div className="mx-4 sm:mx-6 mb-4 bg-white border border-[#E5E5E2] rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#F0F0EE]">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-[#FC5200]" />
              <span className="text-sm font-bold text-[#111110]">AI-treningscoach</span>
            </div>
            <button
              onClick={() => setShowAICoach(false)}
              className="p-1 rounded-full hover:bg-[#F5F5F3] transition-colors"
            >
              <X className="w-4 h-4 text-[#9B9B95]" />
            </button>
          </div>
          <div className="p-4 max-h-64 overflow-y-auto flex flex-col gap-3">
            {aiMessages.length === 0 && (
              <p className="text-xs text-[#9B9B95] text-center py-4">
                Spør meg om treningen din, planen eller Bergen City Marathon! 🏃
              </p>
            )}
            {aiMessages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-xs ${
                    msg.role === "user"
                      ? "bg-[#FC5200] text-white"
                      : "bg-[#F5F5F3] text-[#111110]"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {aiLoading && (
              <div className="flex justify-start">
                <div className="bg-[#F5F5F3] rounded-xl px-3 py-2 text-xs text-[#9B9B95]">
                  Tenker...
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-2 px-4 pb-4">
            <input
              type="text"
              value={aiInput}
              onChange={(e) => setAIInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendAIMessage()}
              placeholder="Spør om trening, pace, plan..."
              className="flex-1 text-xs border border-[#E5E5E2] rounded-full px-3 py-2 focus:outline-none focus:border-[#FC5200] transition-colors"
            />
            <button
              onClick={sendAIMessage}
              disabled={aiLoading || !aiInput.trim()}
              className="bg-[#FC5200] text-white rounded-full px-3 py-2 text-xs font-semibold hover:bg-[#e04a00] transition-colors disabled:opacity-50"
            >
              <MessageCircle className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Tab navigation */}
      <nav className="flex gap-1 px-4 sm:px-6 mb-4">
        {(["oversikt", "okter", "statistikk"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors capitalize ${
              activeTab === tab
                ? "bg-[#111110] text-white"
                : "bg-white text-[#6B6B65] border border-[#E5E5E2] hover:border-[#C8C8C4]"
            }`}
          >
            {tab === "oversikt" ? "Oversikt" : tab === "okter" ? "Økter" : "Statistikk"}
          </button>
        ))}
      </nav>

      {/* Main content */}
      <div className="flex-1 px-4 sm:px-6 pb-8">
        {/* ── OVERSIKT TAB ── */}
        {activeTab === "oversikt" && (
          <div>
            {/* Marathon countdown */}
            <div className="bg-white border border-[#E5E5E2] rounded-2xl p-4 mb-5 hover:border-[#C8C8C4] transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🏁</span>
                  <div>
                    <p className="text-[10px] text-[#9B9B95] uppercase tracking-wide font-medium">Bergen City Marathon</p>
                    <p className="text-xs text-[#6B6B65]">{RACE_DATE}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-[#111110] tabular-nums leading-tight">{daysLeft}</p>
                  <p className="text-[10px] text-[#9B9B95]">dager igjen</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <div className="flex-1 h-2 bg-[#F0F0EE] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#FC5200] rounded-full transition-all duration-700"
                    style={{ width: `${marathonPct}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-[#FC5200] tabular-nums">{marathonPct}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getPhaseBadgeClass(currentPhase)}`}>
                  {currentPhase}
                </span>
                <span className="text-[10px] text-[#9B9B95]">Uke {getCurrentWeek()} av 52</span>
              </div>
            </div>

            {/* Marathon Pace Progress Card */}
            <MarathonPaceCard avgPaceSecPerKm={computed.avgPaceSecPerKm} />

            {/* Weekly km progress */}
            <div className="bg-white border border-[#E5E5E2] rounded-2xl p-4 mb-5 hover:border-[#C8C8C4] transition-colors">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-[#111110]">Ukentlig fremgang</h3>
                <span className="text-xs text-[#6B6B65]">
                  {weeklyActualKm.toFixed(1)} / {weeklyPlanKm} km
                </span>
              </div>
              <div className="h-2.5 bg-[#F0F0EE] rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-[#FC5200] rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (weeklyActualKm / Math.max(weeklyPlanKm, 1)) * 100)}%`,
                  }}
                />
              </div>
              <p className="text-[10px] text-[#9B9B95]">
                {weeklyPlanKm > 0
                  ? `${Math.round((weeklyActualKm / weeklyPlanKm) * 100)}% av ukeplanen gjennomført`
                  : "Ingen plan for denne uken"}
              </p>
            </div>

            {/* Key stats row */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-white border border-[#E5E5E2] rounded-2xl p-3 hover:border-[#C8C8C4] transition-colors">
                <div className="flex items-center gap-1.5 mb-1">
                  <Activity className="w-3.5 h-3.5 text-[#FC5200]" />
                  <p className="text-[10px] text-[#9B9B95] uppercase tracking-wide">Denne uken</p>
                </div>
                <p className="text-xl font-black text-[#111110] tabular-nums">
                  {weeklyActualKm.toFixed(1)}
                  <span className="text-sm font-medium text-[#9B9B95] ml-0.5">km</span>
                </p>
                <p className="text-[10px] text-[#9B9B95] mt-0.5">{computed.weeklyRuns} løp</p>
              </div>
              <div className="bg-white border border-[#E5E5E2] rounded-2xl p-3 hover:border-[#C8C8C4] transition-colors">
                <div className="flex items-center gap-1.5 mb-1">
                  <Timer className="w-3.5 h-3.5 text-[#FC5200]" />
                  <p className="text-[10px] text-[#9B9B95] uppercase tracking-wide">Snittspace</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <p className="text-xl font-black text-[#111110] tabular-nums">
                    {computed.avgPaceSecPerKm > 0 ? formatPace(computed.avgPaceSecPerKm) : "—"}
                  </p>
                  <PaceTrendBadge runs={recentRuns} />
                </div>
                <p className="text-[10px] text-[#9B9B95] mt-0.5">min/km</p>
              </div>
              <div className="bg-white border border-[#E5E5E2] rounded-2xl p-3 hover:border-[#C8C8C4] transition-colors">
                <div className="flex items-center gap-1.5 mb-1">
                  <Mountain className="w-3.5 h-3.5 text-[#FC5200]" />
                  <p className="text-[10px] text-[#9B9B95] uppercase tracking-wide">Lengste løp</p>
                </div>
                <p className="text-xl font-black text-[#111110] tabular-nums">
                  {computed.longestRunKm.toFixed(1)}
                  <span className="text-sm font-medium text-[#9B9B95] ml-0.5">km</span>
                </p>
              </div>
              <div className="bg-white border border-[#E5E5E2] rounded-2xl p-3 hover:border-[#C8C8C4] transition-colors">
                <div className="flex items-center gap-1.5 mb-1">
                  <BarChart2 className="w-3.5 h-3.5 text-[#FC5200]" />
                  <p className="text-[10px] text-[#9B9B95] uppercase tracking-wide">Total km</p>
                </div>
                <p className="text-xl font-black text-[#111110] tabular-nums">
                  {Math.round(computed.totalKmAllTime)}
                  <span className="text-sm font-medium text-[#9B9B95] ml-0.5">km</span>
                </p>
                <p className="text-[10px] text-[#9B9B95] mt-0.5">{computed.totalRunsAllTime} løp totalt</p>
              </div>
            </div>

            {/* Streak indicator */}
            <StreakIndicator recentRuns={recentRuns} />

            {/* Activity calendar */}
            <ActivityCalendar runs={recentRuns} />

            {/* Weekly km chart */}
            <div className="bg-white border border-[#E5E5E2] rounded-2xl p-4 mb-5 hover:border-[#C8C8C4] transition-colors">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-[#111110]">Ukentlig km</h3>
                <span className="text-xs text-[#6B6B65]">Siste 8 uker</span>
              </div>
              <BarChart data={chartData} />
            </div>
          </div>
        )}

        {/* ── ØKTER TAB ── */}
        {activeTab === "okter" && (
          <div>
            {/* This week's plan */}
            <div className="bg-white border border-[#E5E5E2] rounded-2xl p-4 mb-5">
              <div className="mb-3">
                <PhaseCompletionBadge recentRuns={recentRuns} />
                <h3 className="text-sm font-bold text-[#111110]">Ukens plan</h3>
                <p className="text-[10px] text-[#9B9B95]">Uke {getCurrentWeek()} · {currentPhase}</p>
              </div>
              <div className="flex flex-col gap-2">
                {planSessions.map((session, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors ${
                      session.done
                        ? "bg-green-50 border border-green-200"
                        : "bg-[#F5F5F3] border border-transparent"
                    }`}
                  >
                    <span className="text-lg shrink-0">{session.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-semibold text-[#111110] truncate">
                          {session.day} – {session.type}
                        </p>
                        {session.done && (
                          <span className="text-[10px] bg-green-100 text-green-700 border border-green-300 rounded-full px-1.5 py-0.5 shrink-0">
                            ✓ Ferdig
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-[#9B9B95]">
                        {session.distance} · {session.pace}
                      </p>
                    </div>
                    {!session.done && (
                      <Play className="w-4 h-4 text-[#9B9B95] shrink-0" />
                    )}
                  </div>
                ))}
              </div>
              <Link
                href="/plan"
                className="flex items-center justify-center gap-1.5 mt-3 text-xs font-semibold text-[#FC5200] hover:underline"
              >
                Se full plan <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Recent runs */}
            <div className="bg-white border border-[#E5E5E2] rounded-2xl p-4 mb-5">
              <h3 className="text-sm font-bold text-[#111110] mb-3">Siste løp</h3>
              {recentRuns.length === 0 ? (
                <p className="text-xs text-[#9B9B95] text-center py-4">Ingen løp registrert ennå.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {recentRuns.slice(0, 8).map((run, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2.5 bg-[#F5F5F3] rounded-xl"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">🏃</span>
                        <div>
                          <p className="text-xs font-semibold text-[#111110] truncate max-w-[140px]">
                            {run.name}
                          </p>
                          <p className="text-[10px] text-[#9B9B95]">
                            {formatDate(run.start_date_local)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-[#111110] tabular-nums">
                          {metersToKm(run.distance)} km
                        </p>
                        <p className="text-[10px] text-[#9B9B95] tabular-nums">
                          {activityPace(run)} · {formatMovingTime(run.moving_time)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── STATISTIKK TAB ── */}
        {activeTab === "statistikk" && (
          <div>
            {/* Personal bests */}
            <div className="bg-white border border-[#E5E5E2] rounded-2xl p-4 mb-5">
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="w-4 h-4 text-yellow-500" />
                <h3 className="text-sm font-bold text-[#111110]">Personlige rekorder</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#F5F5F3] rounded-xl p-3">
                  <p className="text-[10px] text-[#9B9B95] uppercase tracking-wide mb-1">5 km</p>
                  <p className="text-lg font-black text-[#111110] tabular-nums">
                    {personalBests.fiveKm > 0 ? formatPRTime(personalBests.fiveKm) : "—"}
                  </p>
                  {personalBests.fiveKmDate && personalBests.fiveKm > 0 && (
                    <p className="text-[10px] text-[#9B9B95] mt-0.5">{formatDate(personalBests.fiveKmDate)}</p>
                  )}
                </div>
                <div className="bg-[#F5F5F3] rounded-xl p-3">
                  <p className="text-[10px] text-[#9B9B95] uppercase tracking-wide mb-1">10 km</p>
                  <p className="text-lg font-black text-[#111110] tabular-nums">
                    {personalBests.tenKm > 0 ? formatPRTime(personalBests.tenKm) : "—"}
                  </p>
                  {personalBests.tenKmDate && personalBests.tenKm > 0 && (
                    <p className="text-[10px] text-[#9B9B95] mt-0.5">{formatDate(personalBests.tenKmDate)}</p>
                  )}
                </div>
                <div className="bg-[#F5F5F3] rounded-xl p-3 col-span-2">
                  <p className="text-[10px] text-[#9B9B95] uppercase tracking-wide mb-1">Lengste løp</p>
                  <p className="text-lg font-black text-[#111110] tabular-nums">
                    {personalBests.longestKm > 0 ? `${personalBests.longestKm.toFixed(1)} km` : "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* Pace trend chart */}
            <div className="bg-white border border-[#E5E5E2] rounded-2xl p-4 mb-5">
              <h3 className="text-sm font-bold text-[#111110] mb-3">Pacetrend</h3>
              <PaceTrendChart runs={recentRuns} />
            </div>

            {/* Pace zones */}
            {paceZones.length > 0 && (
              <div className="bg-white border border-[#E5E5E2] rounded-2xl p-4 mb-5">
                <h3 className="text-sm font-bold text-[#111110] mb-3">Pace-soner (siste 10 løp)</h3>
                <div className="flex flex-col gap-2">
                  {paceZones.map((z, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${z.zone.dotClass}`}
                      />
                      <span className="text-xs text-[#6B6B65] w-16 shrink-0">{z.zone.label}</span>
                      <div className="flex-1 h-2 bg-[#F0F0EE] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${z.zone.dotClass}`}
                          style={{ width: `${z.percentage}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-[#9B9B95] w-8 text-right tabular-nums">
                        {z.percentage}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All-time stats */}
            <div className="bg-white border border-[#E5E5E2] rounded-2xl p-4 mb-5">
              <h3 className="text-sm font-bold text-[#111110] mb-3">Totalstatistikk</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#F5F5F3] rounded-xl p-3">
                  <p className="text-[10px] text-[#9B9B95] uppercase tracking-wide mb-1">Totale løp</p>
                  <p className="text-xl font-black text-[#111110] tabular-nums">{computed.totalRunsAllTime}</p>
                </div>
                <div className="bg-[#F5F5F3] rounded-xl p-3">
                  <p className="text-[10px] text-[#9B9B95] uppercase tracking-wide mb-1">Total km</p>
                  <p className="text-xl font-black text-[#111110] tabular-nums">{Math.round(computed.totalKmAllTime)}</p>
                </div>
                <div className="bg-[#F5F5F3] rounded-xl p-3">
                  <p className="text-[10px] text-[#9B9B95] uppercase tracking-wide mb-1">YTD km</p>
                  <p className="text-xl font-black text-[#111110] tabular-nums">{Math.round(computed.ytdKm)}</p>
                </div>
                <div className="bg-[#F5F5F3] rounded-xl p-3">
                  <p className="text-[10px] text-[#9B9B95] uppercase tracking-wide mb-1">Snittspace</p>
                  <p className="text-xl font-black text-[#111110] tabular-nums">
                    {computed.avgPaceSecPerKm > 0 ? formatPace(computed.avgPaceSecPerKm) : "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
