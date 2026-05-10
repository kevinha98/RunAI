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

// ── WeeklyProgressBar-komponent ──────────────────────────────────────────────

/**
 * Computes weekly progress data for the progress bar.
 * Returns actual km this week, planned km, and fill percentage (0–100).
 */
function getWeeklyProgressData(recentRuns: StravaActivity[]): {
  actualKm: number;
  planKm: number;
  pct: number;
  label: string;
} {
  const now = new Date();
  const weekStart = getWeekStart(now);
  const weekEnd = getWeekEnd(now);

  const actualKm = recentRuns
    .filter((r) => {
      const d = new Date(r.start_date_local);
      return d >= weekStart && d <= weekEnd;
    })
    .reduce((sum, r) => sum + r.distance / 1000, 0);

  const currentWeek = getCurrentWeek();
  const weekData = WEEKS.find((w) => w.week === currentWeek) ?? WEEKS[0];
  const planKm = weekData.totalKm;

  const pct = planKm > 0 ? Math.min(100, Math.round((actualKm / planKm) * 1000) / 10) : 0;
  const label = `${actualKm.toFixed(1)} / ${planKm} km`;

  return { actualKm, planKm, pct, label };
}

function WeeklyProgressBar({ recentRuns }: { recentRuns: StravaActivity[] }) {
  const { pct, label, actualKm, planKm } = useMemo(
    () => getWeeklyProgressData(recentRuns),
    [recentRuns]
  );

  const isComplete = pct >= 100;

  const barColor = isComplete ? "#22c55e" : STRAVA_ORANGE;

  return (
    <div className="mt-4 bg-white border border-[#E5E5E2] rounded-xl p-3 hover:border-[#C8C8C4] transition-colors">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-[#6B6B65] uppercase tracking-wide">
          Ukens fremgang
        </span>
        <span className="text-xs font-semibold text-[#111110]">
          {label}
          <span className="ml-1.5 text-[#9B9B95] font-normal">({pct.toFixed(1)}%)</span>
        </span>
      </div>
      <div className="w-full h-3 bg-[#F0F0EE] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${pct}%`,
            backgroundColor: barColor,
          }}
        />
      </div>
      {isComplete && (
        <p className="mt-1.5 text-xs text-emerald-600 font-medium flex items-center gap-1">
          <Trophy className="w-3 h-3" />
          Ukemål nådd! 🎉
        </p>
      )}
      {!isComplete && planKm > 0 && (
        <p className="mt-1 text-[10px] text-[#9B9B95]">
          {(planKm - actualKm).toFixed(1)} km gjenstår av ukemålet
        </p>
      )}
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
  badgeTextClass: string;
  label: string;
}

function computePaceProgress(runs: StravaActivity[]): PaceProgressResult | null {
  const validRuns = runs.filter((r) => r.distance > 0 && r.moving_time > 0);
  if (validRuns.length === 0) return null;

  const sorted = [...validRuns].sort(
    (a, b) =>
      new Date(b.start_date_local).getTime() -
      new Date(a.start_date_local).getTime()
  );

  const recent5 = sorted.slice(0, 5);
  const avgSec =
    recent5.reduce((sum, r) => sum + r.moving_time / (r.distance / 1000), 0) /
    recent5.length;

  const diffSec = avgSec - TARGET_PACE_SEC_PER_KM;
  const progressPct =
    diffSec <= 0
      ? 100
      : Math.max(0, Math.round((1 - diffSec / MAX_DELTA_SEC) * 100));

  const colorClass =
    diffSec <= 0
      ? "text-emerald-600"
      : diffSec < 20
      ? "text-amber-600"
      : "text-red-500";

  const barColorClass =
    diffSec <= 0
      ? "bg-emerald-500"
      : diffSec < 20
      ? "bg-amber-400"
      : "bg-red-400";

  const badgeBgClass =
    diffSec <= 0
      ? "bg-emerald-50 border-emerald-200"
      : diffSec < 20
      ? "bg-amber-50 border-amber-200"
      : "bg-red-50 border-red-200";

  const badgeTextClass =
    diffSec <= 0
      ? "text-emerald-700"
      : diffSec < 20
      ? "text-amber-700"
      : "text-red-600";

  const label =
    diffSec <= 0
      ? `${Math.abs(diffSec).toFixed(0)}s/km foran mål`
      : `${diffSec.toFixed(0)}s/km bak mål`;

  return {
    currentPaceSec: avgSec,
    diffSec,
    progressPct,
    colorClass,
    barColorClass,
    badgeBgClass,
    badgeTextClass,
    label,
  };
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
  const [expandedRun, setExpandedRun] = useState<number | null>(null);
  const [dismissedStatus, setDismissedStatus] = useState(false);

  const recentRuns = stravaData.recentRuns ?? [];
  const recentActivities = stravaData.recentActivities ?? [];
  const computed = stravaData.computed;
  const athlete = stravaData.athlete;

  const planSessions = useMemo(() => getPlanSessions(recentRuns), [recentRuns]);
  const weeklyBuckets = useMemo(() => weeklyKmBuckets(recentRuns, 8), [recentRuns]);
  const personalBests = useMemo(() => computePersonalBests(recentRuns), [recentRuns]);
  const paceProgress = useMemo(() => computePaceProgress(recentRuns), [recentRuns]);
  const marathonProgress = useMemo(() => getMarathonProgress(), []);

  const weeklyPlanKm = getWeeklyPlanKm();
  const weeklyActualKm = useMemo(() => getWeeklyActualKm(recentRuns), [recentRuns]);

  const paceZones = useMemo(
    () => computePaceZoneDistribution(recentRuns, computed.avgPaceSecPerKm, 10),
    [recentRuns, computed.avgPaceSecPerKm]
  );

  const syncAgeMinutes = useMemo(() => {
    if (!stravaData.lastSync) return null;
    const diff = Date.now() - new Date(stravaData.lastSync).getTime();
    return Math.floor(diff / 60000);
  }, [stravaData.lastSync]);

  const isSyncFresh = syncAgeMinutes !== null && syncAgeMinutes < 10;

  const handleSync = useCallback(() => {
    router.push("/api/strava/sync?redirect=/dashboard");
  }, [router]);

  // Status banner
  const showStatusBanner = !dismissedStatus && stravaStatus;
  const statusMessage =
    stravaStatus === "connected"
      ? "✅ Strava-konto koblet til! Data synkroniseres."
      : stravaStatus === "error"
      ? "❌ Kunne ikke koble til Strava. Prøv igjen."
      : null;

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Status banner */}
        {showStatusBanner && statusMessage && (
          <div
            className={`mb-4 flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium border ${
              stravaStatus === "connected"
                ? "bg-green-50 border-green-200 text-green-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            <span>{statusMessage}</span>
            <button
              onClick={() => setDismissedStatus(true)}
              className="ml-3 text-current opacity-60 hover:opacity-100 transition-opacity"
              aria-label="Lukk melding"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-[#111110] tracking-tight">
              {athlete?.firstname ? `Hei, ${athlete.firstname}! 👋` : "Dashboard"}
            </h1>
            <p className="text-sm text-[#6B6B65] mt-0.5">
              Bergen City Marathon · {RACE_DATE}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isSyncFresh && <SyncFreshDot />}
            <button
              onClick={handleSync}
              className="flex items-center gap-1.5 rounded-full bg-[#FC5200] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#E04A00] transition-colors"
            >
              <Play className="h-3 w-3" />
              Synk
            </button>
          </div>
        </div>

        {/* Marathon countdown */}
        <div className="bg-white border border-[#E5E5E2] rounded-2xl p-4 mb-5 hover:border-[#C8C8C4] transition-colors">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">🏁</span>
              <div>
                <p className="text-[10px] text-[#6B6B65] font-medium uppercase tracking-wide">
                  Bergen City Marathon
                </p>
                <p className="text-xl font-black text-[#111110] tabular-nums">
                  {marathonProgress.daysLeft}
                  <span className="text-sm font-medium text-[#6B6B65] ml-1">dager igjen</span>
                </p>
              </div>
            </div>
            <span
              className={`text-xs font-semibold px-3 py-1 rounded-full ${getPhaseBadgeClass(
                marathonProgress.currentPhase
              )}`}
            >
              {marathonProgress.currentPhase}
            </span>
          </div>
          <div className="w-full h-2 bg-[#F0F0EE] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-[#FC5200] transition-all duration-700"
              style={{ width: `${marathonProgress.pct}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-[#9B9B95]">Start</span>
            <span className="text-[10px] text-[#9B9B95]">{marathonProgress.pct}% fullført</span>
            <span className="text-[10px] text-[#9B9B95]">Løp</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-[#F0F0EE] rounded-xl p-1 mb-5">
          {(["oversikt", "okter", "statistikk"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold capitalize transition-all ${
                activeTab === tab
                  ? "bg-white text-[#111110] shadow-sm"
                  : "text-[#6B6B65] hover:text-[#111110]"
              }`}
            >
              {tab === "oversikt" ? "Oversikt" : tab === "okter" ? "Økter" : "Statistikk"}
            </button>
          ))}
        </div>

        {/* ── Tab: Oversikt ── */}
        {activeTab === "oversikt" && (
          <div>
            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-white border border-[#E5E5E2] rounded-2xl p-4 hover:border-[#C8C8C4] transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="h-4 w-4 text-[#FC5200]" />
                  <span className="text-xs text-[#6B6B65] font-medium">Denne uken</span>
                </div>
                <p className="text-2xl font-black text-[#111110] tabular-nums">
                  {weeklyActualKm.toFixed(1)}
                  <span className="text-sm font-medium text-[#6B6B65] ml-1">km</span>
                </p>
                <p className="text-xs text-[#9B9B95] mt-0.5">av {weeklyPlanKm} km planlagt</p>
              </div>
              <div className="bg-white border border-[#E5E5E2] rounded-2xl p-4 hover:border-[#C8C8C4] transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-[#FC5200]" />
                  <span className="text-xs text-[#6B6B65] font-medium">Snittfart</span>
                </div>
                <p className="text-2xl font-black text-[#111110] tabular-nums">
                  {formatPace(computed.avgPaceSecPerKm)}
                </p>
                <p className="text-xs text-[#9B9B95] mt-0.5">min/km · siste løp</p>
              </div>
              <div className="bg-white border border-[#E5E5E2] rounded-2xl p-4 hover:border-[#C8C8C4] transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <Mountain className="h-4 w-4 text-[#FC5200]" />
                  <span className="text-xs text-[#6B6B65] font-medium">Lengste løp</span>
                </div>
                <p className="text-2xl font-black text-[#111110] tabular-nums">
                  {computed.longestRunKm.toFixed(1)}
                  <span className="text-sm font-medium text-[#6B6B65] ml-1">km</span>
                </p>
                <p className="text-xs text-[#9B9B95] mt-0.5">din lengste økt</p>
              </div>
              <div className="bg-white border border-[#E5E5E2] rounded-2xl p-4 hover:border-[#C8C8C4] transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="h-4 w-4 text-[#FC5200]" />
                  <span className="text-xs text-[#6B6B65] font-medium">Totalt</span>
                </div>
                <p className="text-2xl font-black text-[#111110] tabular-nums">
                  {Math.round(computed.totalKmAllTime)}
                  <span className="text-sm font-medium text-[#6B6B65] ml-1">km</span>
                </p>
                <p className="text-xs text-[#9B9B95] mt-0.5">{computed.totalRunsAllTime} løp totalt</p>
              </div>
            </div>

            {/* Pace mot mål */}
            {paceProgress && (
              <div className="bg-white border border-[#E5E5E2] rounded-2xl p-4 mb-5 hover:border-[#C8C8C4] transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Timer className="h-4 w-4 text-[#FC5200]" />
                    <span className="text-sm font-bold text-[#111110]">Pace mot mål</span>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                      paceProgress.badgeBgClass
                    } ${paceProgress.badgeTextClass}`}
                  >
                    {paceProgress.label}
                  </span>
                </div>
                <div className="flex items-end justify-between mb-1.5">
                  <div>
                    <p className="text-2xl font-black text-[#111110] tabular-nums">
                      {formatPace(paceProgress.currentPaceSec)}
                    </p>
                    <p className="text-xs text-[#9B9B95]">snitt siste 5 løp</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[#6B6B65]">{TARGET_PACE_LABEL}</p>
                    <p className="text-[10px] text-[#9B9B95]">{TARGET_RACE_LABEL}</p>
                  </div>
                </div>
                <div className="w-full h-2.5 bg-[#F0F0EE] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${paceProgress.barColorClass}`}
                    style={{ width: `${paceProgress.progressPct}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-[#9B9B95]">Langt fra mål</span>
                  <span className="text-[10px] text-[#9B9B95]">{paceProgress.progressPct}%</span>
                  <span className="text-[10px] text-[#9B9B95]">På mål</span>
                </div>
              </div>
            )}

            {/* PR-kort */}
            <div className="bg-white border border-[#E5E5E2] rounded-2xl p-4 mb-5 hover:border-[#C8C8C4] transition-colors">
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="h-4 w-4 text-[#FC5200]" />
                <h3 className="text-sm font-bold text-[#111110]">Personlige rekorder</h3>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-[10px] text-[#9B9B95] mb-1 uppercase tracking-wide">5 km</p>
                  <p className="text-lg font-black text-[#111110] tabular-nums">
                    {personalBests.fiveKm > 0 ? formatPRTime(personalBests.fiveKm) : "—"}
                  </p>
                  {personalBests.fiveKmDate && (
                    <p className="text-[9px] text-[#9B9B95] mt-0.5">{formatDate(personalBests.fiveKmDate)}</p>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-[#9B9B95] mb-1 uppercase tracking-wide">10 km</p>
                  <p className="text-lg font-black text-[#111110] tabular-nums">
                    {personalBests.tenKm > 0 ? formatPRTime(personalBests.tenKm) : "—"}
                  </p>
                  {personalBests.tenKmDate && (
                    <p className="text-[9px] text-[#9B9B95] mt-0.5">{formatDate(personalBests.tenKmDate)}</p>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-[#9B9B95] mb-1 uppercase tracking-wide">Lengst</p>
                  <p className="text-lg font-black text-[#111110] tabular-nums">
                    {personalBests.longestKm > 0 ? `${personalBests.longestKm.toFixed(1)} km` : "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* Weekly km chart */}
            <div className="bg-white border border-[#E5E5E2] rounded-2xl p-4 mb-5 hover:border-[#C8C8C4] transition-colors">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-[#111110]">Ukentlig km</h3>
                <span className="text-xs text-[#6B6B65]">Siste 8 uker</span>
              </div>
              {weeklyBuckets.length > 0 ? (
                <BarChart
                  data={weeklyBuckets.map((b) => ({ label: b.label, value: b.km }))}
                />
              ) : (
                <p className="text-xs text-[#6B6B65]">Ingen løp registrert ennå</p>
              )}
            </div>

            {/* Aktivitetskalender */}
            <ActivityCalendar runs={recentRuns} />

            {/* Streak */}
            <StreakIndicator recentRuns={recentRuns} />
          </div>
        )}

        {/* ── Tab: Økter ── */}
        {activeTab === "okter" && (
          <div>
            {/* Ukens plan */}
            <div className="bg-white border border-[#E5E5E2] rounded-2xl p-4 mb-5 hover:border-[#C8C8C4] transition-colors">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-[#111110]">Ukens plan</h3>
                <Link
                  href="/plan"
                  className="flex items-center gap-1 text-xs text-[#FC5200] font-semibold hover:underline"
                >
                  Se full plan <ChevronRight className="h-3 w-3" />
                </Link>
              </div>

              <PhaseCompletionBadge recentRuns={recentRuns} />

              <div className="space-y-2">
                {planSessions.map((session, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                      session.done
                        ? "bg-emerald-50 border border-emerald-200"
                        : "bg-[#F8F8F7] border border-transparent hover:border-[#E5E5E2]"
                    }`}
                  >
                    <span className="text-lg leading-none">{session.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#111110]">{session.day}</span>
                        <span className="text-xs text-[#6B6B65] truncate">{session.type}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-[#9B9B95]">{session.distance}</span>
                        <span className="text-[10px] text-[#9B9B95]">·</span>
                        <span className="text-[10px] text-[#9B9B95]">{session.pace}</span>
                      </div>
                    </div>
                    {session.done && (
                      <span className="text-xs font-semibold text-emerald-600 bg-emerald-100 rounded-full px-2 py-0.5 shrink-0">
                        ✓ Gjort
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Ukens fremgangsbar */}
              <WeeklyProgressBar recentRuns={recentRuns} />
            </div>

            {/* Siste løp */}
            <div className="bg-white border border-[#E5E5E2] rounded-2xl p-4 mb-5 hover:border-[#C8C8C4] transition-colors">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-[#111110]">Siste løp</h3>
                <span className="text-xs text-[#6B6B65]">{recentRuns.length} løp</span>
              </div>
              {recentRuns.length === 0 ? (
                <p className="text-xs text-[#6B6B65]">Ingen løp registrert ennå</p>
              ) : (
                <div className="space-y-2">
                  {recentRuns.slice(0, 8).map((run, i) => {
                    const isExpanded = expandedRun === i;
                    const paceZone = computePaceZoneDistribution(
                      [run],
                      computed.avgPaceSecPerKm,
                      1
                    )[0]?.zone;

                    return (
                      <div key={i}>
                        <button
                          onClick={() => setExpandedRun(isExpanded ? null : i)}
                          className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 bg-[#F8F8F7] hover:bg-[#F0F0EE] transition-colors text-left"
                        >
                          <span className="text-lg">🏃</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-[#111110] truncate">
                                {run.name}
                              </span>
                              <PaceTrendBadge runs={recentRuns.slice(i)} />
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-[#9B9B95]">
                                {metersToKm(run.distance)} km
                              </span>
                              <span className="text-[10px] text-[#9B9B95]">·</span>
                              <span className="text-[10px] text-[#9B9B95]">
                                {activityPace(run)} /km
                              </span>
                              <span className="text-[10px] text-[#9B9B95]">·</span>
                              <span className="text-[10px] text-[#9B9B95]">
                                {formatDate(run.start_date_local)}
                              </span>
                            </div>
                          </div>
                          {paceZone && (
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${
                                paceZone.bgClass
                              } ${paceZone.textClass} ${paceZone.borderClass}`}
                            >
                              {paceZone.label}
                            </span>
                          )}
                          <ChevronRight
                            className={`h-3.5 w-3.5 text-[#9B9B95] transition-transform shrink-0 ${
                              isExpanded ? "rotate-90" : ""
                            }`}
                          />
                        </button>
                        {isExpanded && (
                          <div className="mt-1 mx-1 rounded-xl bg-[#F8F8F7] border border-[#E5E5E2] px-4 py-3 grid grid-cols-2 gap-y-2 gap-x-4">
                            <div>
                              <p className="text-[10px] text-[#9B9B95] uppercase tracking-wide">Distanse</p>
                              <p className="text-sm font-bold text-[#111110]">{metersToKm(run.distance)} km</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-[#9B9B95] uppercase tracking-wide">Tid</p>
                              <p className="text-sm font-bold text-[#111110]">{formatMovingTime(run.moving_time)}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-[#9B9B95] uppercase tracking-wide">Pace</p>
                              <p className="text-sm font-bold text-[#111110]">{activityPace(run)} /km</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-[#9B9B95] uppercase tracking-wide">Fart</p>
                              <p className="text-sm font-bold text-[#111110]">{mpsToKmh(run.average_speed)} km/t</p>
                            </div>
                            {run.total_elevation_gain > 0 && (
                              <div>
                                <p className="text-[10px] text-[#9B9B95] uppercase tracking-wide">Høydemeter</p>
                                <p className="text-sm font-bold text-[#111110]">{Math.round(run.total_elevation_gain)} m</p>
                              </div>
                            )}
                            {run.average_heartrate && (
                              <div>
                                <p className="text-[10px] text-[#9B9B95] uppercase tracking-wide">Puls</p>
                                <p className="text-sm font-bold text-[#111110]">{Math.round(run.average_heartrate)} bpm</p>
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

        {/* ── Tab: Statistikk ── */}
        {activeTab === "statistikk" && (
          <div>
            {/* Pace-trend */}
            <div className="bg-white border border-[#E5E5E2] rounded-2xl p-4 mb-5 hover:border-[#C8C8C4] transition-colors">
              <div className="flex items-center gap-2 mb-3">
                <BarChart2 className="h-4 w-4 text-[#FC5200]" />
                <h3 className="text-sm font-bold text-[#111110]">Pace-trend</h3>
              </div>
              <PaceTrendChart runs={recentRuns} />
            </div>

            {/* Pace-soner */}
            <div className="bg-white border border-[#E5E5E2] rounded-2xl p-4 mb-5 hover:border-[#C8C8C4] transition-colors">
              <div className="flex items-center gap-2 mb-3">
                <Heart className="h-4 w-4 text-[#FC5200]" />
                <h3 className="text-sm font-bold text-[#111110]">Pace-soner</h3>
                <span className="text-xs text-[#9B9B95]">siste 10 løp</span>
              </div>
              {paceZones.length === 0 ? (
                <p className="text-xs text-[#6B6B65]">Ingen data</p>
              ) : (
                <div className="space-y-2">
                  {paceZones.map((z, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div
                        className={`w-2 h-2 rounded-full shrink-0 ${z.zone.dotClass}`}
                      />
                      <span className="text-xs text-[#6B6B65] w-16 shrink-0">{z.zone.label}</span>
                      <div className="flex-1 h-2 bg-[#F0F0EE] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${z.zone.dotClass}`}
                          style={{ width: `${z.percentage}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-[#111110] w-8 text-right tabular-nums">
                        {z.percentage}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Aktivitetskalender */}
            <ActivityCalendar runs={recentRuns} />

            {/* AI Coach link */}
            <div className="bg-gradient-to-br from-[#FC5200] to-[#E04A00] rounded-2xl p-4 mb-5">
              <div className="flex items-center gap-3 mb-3">
                <Brain className="h-5 w-5 text-white" />
                <h3 className="text-sm font-bold text-white">AI Løpecoach</h3>
              </div>
              <p className="text-xs text-orange-100 mb-3">
                Få personlig tilpassede råd basert på din treningsdata og maratonplan.
              </p>
              <Link
                href="/coach"
                className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 text-xs font-semibold text-[#FC5200] hover:bg-orange-50 transition-colors w-fit"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Chat med coach
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        )}

        {/* Sync info */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#E5E5E2]">
          <span className="text-[10px] text-[#9B9B95]">
            Sist synkronisert:{" "}
            {stravaData.lastSync
              ? new Date(stravaData.lastSync).toLocaleString("nb-NO", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Aldri"}
          </span>
          {isSyncFresh && (
            <span className="text-[10px] text-green-600 font-medium flex items-center gap-1">
              <SyncFreshDot />
              Fersk data
            </span>
          )}
        </div>
      </div>
    </main>
  );
}
