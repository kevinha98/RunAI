"use client";

import { useState, useCallback, useMemo } from "react";
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
} from "lucide-react";
import type { StoredStats, StravaActivity } from "@/lib/strava-types";
import { formatPace, computePaceZoneDistribution } from "@/lib/strava-types";
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
  return `${isoYear}-W${String(weekNum).padStart(2, "0")}`;
}

/**
 * Checks whether a planned session has a matching Strava activity on the same weekday in the current week.
 */
function isSessionDone(sessionDay: string, recentRuns: StravaActivity[]): boolean {
  const targetDayIdx = DAY_IDX[sessionDay];
  if (targetDayIdx === undefined) return false;
  const now = new Date();
  const weekStart = getWeekStart(now);
  const weekEnd = getWeekEnd(now);
  return recentRuns.some((run) => {
    const runDate = new Date(run.start_date_local);
    return (
      runDate >= weekStart &&
      runDate <= weekEnd &&
      runDate.getDay() === targetDayIdx
    );
  });
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

// Tooltip helpers
function clampTooltipX(cx: number, tooltipW: number, svgW: number): number {
  return Math.min(Math.max(cx - tooltipW / 2, 2), svgW - tooltipW - 2);
}

function clampTooltipY(cy: number, tooltipH: number, minY: number): number {
  const above = cy - tooltipH - 8;
  return above < minY ? cy + 12 : above;
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
          Åpne Strava-profil
        </a>
      </div>

      <p className="text-xs text-gray-400 mt-1">
        Husk at aktiviteter må være satt til «public» eller «followers» på Strava for å bli hentet.
      </p>
    </div>
  );
}

// Main component

interface Props { stravaData: StoredStats; stravaStatus?: string | null; }

export default function DashboardClient({ stravaData, stravaStatus }: Props) {
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/strava/sync", { method: "POST" });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setIsSyncing(false);
    }
  }, [router]);

  const minutesSinceSync = stravaData.lastSync
    ? Math.round((Date.now() - new Date(stravaData.lastSync).getTime()) / 60000)
    : null;

  const { computed, athlete, recentRuns, stravaStats } = stravaData;
  const hasData = athlete !== null;
  const hasRuns = recentRuns.length > 0;
  const athleteName = athlete?.firstname ?? null;

  const todayIdx = new Date().getDay();

  // Build weekly plan sessions with done-state based on Strava activities
  const thisWeek = useMemo(
    () =>
      getPlanSessions(recentRuns).map((d) => ({
        ...d,
        today: d.dayIdx === todayIdx,
      })),
    [recentRuns, todayIdx]
  );

  const today = thisWeek.find((d) => d.today);
  const daysUntilRace = Math.ceil((new Date(RACE_DATE).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  const runsWithPace = useMemo(
    () => recentRuns.filter((r) => r.distance > 0 && r.moving_time > 0),
    [recentRuns]
  );

  const bestPace = useMemo(() => {
    if (!runsWithPace.length) return 0;
    return Math.min(...runsWithPace.map((r) => activityPaceSec(r)));
  }, [runsWithPace]);

  const avgHR = useMemo(() => {
    const runsWithHR = runsWithPace.filter((r) => r.average_heartrate);
    if (!runsWithHR.length) return null;
    return Math.round(
      runsWithHR.reduce((s, r) => s + (r.average_heartrate ?? 0), 0) / runsWithHR.length
    );
  }, [runsWithPace]);

  const totalElevationMonth = useMemo(() => {
    const now = new Date();
    return recentRuns
      .filter((r) => {
        const d = new Date(r.start_date_local);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((s, r) => s + (r.total_elevation_gain ?? 0), 0);
  }, [recentRuns]);

  const avgSpeedKmh = useMemo(() => {
    if (!runsWithPace.length) return 0;
    return runsWithPace.reduce((s, r) => s + (r.average_speed ?? 0), 0) / runsWithPace.length * 3.6;
  }, [runsWithPace]);

  const weeklyBuckets = useMemo(
    () => weeklyKmBuckets(recentRuns, 8),
    [recentRuns]
  );

  const recentRunCount = stravaStats?.recent_run_totals?.count ?? 0;
  const ytdElevation = Math.round(
    ((stravaStats?.ytd_run_totals as { elevation_gain?: number } | null)?.elevation_gain) ?? 0
  );

  const avgRunDistKm = useMemo(() => {
    if (!runsWithPace.length) return 0;
    return runsWithPace.reduce((s, r) => s + r.distance / 1000, 0) / runsWithPace.length;
  }, [runsWithPace]);

  const { last5Pace, prev5Pace, paceDelta } = useMemo(() => {
    const last5 = runsWithPace.slice(0, 5);
    const prev5 = runsWithPace.slice(5, 10);
    const last5PaceSec = last5.length
      ? last5.reduce((s, r) => s + activityPaceSec(r), 0) / last5.length
      : 0;
    const prev5PaceSec = prev5.length
      ? prev5.reduce((s, r) => s + activityPaceSec(r), 0) / prev5.length
      : 0;
    const delta = prev5PaceSec > 0 ? prev5PaceSec - last5PaceSec : 0;
    return { last5Pace: last5PaceSec, prev5Pace: prev5PaceSec, paceDelta: delta };
  }, [runsWithPace]);

  // suppress unused var warning
  void prev5Pace;
  void last5Pace;

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
          <span className="font-bold text-base">RunAI</span>
        </div>
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#E5E5E2] bg-white hover:border-[#C8C8C4] transition-colors disabled:opacity-50"
        >
          <Zap size={11} className="text-[#FC5200]" />
          {isSyncing ? "Synker…" : "Synk"}
        </button>
      </div>

      {/* Mobile Marathon Banner */}
      <MobileMarathonBanner />

      {/* Header */}
      <div className="hidden md:flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black tracking-tight">
            {athleteName ? `Hei, ${athleteName} 👋` : "Dashboard"}
          </h1>
          <p className="text-sm text-[#6B6B65] mt-0.5">
            {daysUntilRace > 0
              ? `${daysUntilRace} dager til Bergen City Marathon`
              : "Bergen City Marathon — løpsdagen er her!"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {minutesSinceSync !== null && (
            <span className="text-xs text-[#6B6B65]">
              Oppdatert {minutesSinceSync < 1 ? "nå nettopp" : `${minutesSinceSync} min siden`}
            </span>
          )}
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl border border-[#E5E5E2] bg-white hover:border-[#C8C8C4] transition-colors disabled:opacity-50"
          >
            <Zap size={13} className="text-[#FC5200]" />
            {isSyncing ? "Synkroniserer…" : "Synkroniser"}
          </button>
        </div>
      </div>

      {/* Empty runs banner */}
      {hasData && !hasRuns && (
        <EmptyRunsBanner
          onSync={handleSync}
          isSyncing={isSyncing}
          athleteId={athlete?.id}
        />
      )}

      {/* Not connected */}
      {!hasData && (
        <div className="mb-6 rounded-2xl border border-dashed border-[#E5E5E2] bg-white p-8 flex flex-col items-center gap-3 text-center">
          <StravaIcon />
          <p className="text-sm font-semibold">Koble til Strava for å se statistikk</p>
          <Link
            href="/api/strava/connect"
            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
            style={{ backgroundColor: STRAVA_ORANGE }}
          >
            <StravaIcon />
            Koble til Strava
          </Link>
        </div>
      )}

      {/* AI Coach CTA */}
      <div className="mb-6 rounded-2xl bg-[#1C1C1A] p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#FC5200] flex items-center justify-center shrink-0">
            <Brain size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">AI-trener</p>
            <p className="text-xs text-[#8A8A85]">
              {today
                ? `I dag: ${today.type} — ${today.distance}`
                : "Spør om treningsplanen din"}
            </p>
          </div>
        </div>
        <Link
          href="/chat"
          className="flex items-center gap-1.5 shrink-0 text-xs font-semibold px-3 py-2 rounded-xl bg-[#FC5200] text-white hover:opacity-90 transition-opacity"
        >
          <MessageCircle size={13} />
          Chat
        </Link>
      </div>

      {/* Today's session */}
      {today && (
        <div className="mb-6 rounded-2xl border border-[#E5E5E2] bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-base">{today.icon}</span>
              <div>
                <p className="text-xs text-[#6B6B65] font-medium">I dag</p>
                <p className="text-sm font-bold">{today.type}</p>
              </div>
            </div>
            <Link
              href="/plan"
              className="flex items-center gap-1 text-xs font-semibold text-[#FC5200] hover:underline"
            >
              Se plan <ChevronRight size={12} />
            </Link>
          </div>
          <div className="flex gap-3">
            <div className="flex-1 bg-[#F5F5F3] rounded-xl px-3 py-2">
              <p className="text-[10px] text-[#6B6B65] font-medium mb-0.5">Distanse</p>
              <p className="text-sm font-bold">{today.distance}</p>
            </div>
            <div className="flex-1 bg-[#F5F5F3] rounded-xl px-3 py-2">
              <p className="text-[10px] text-[#6B6B65] font-medium mb-0.5">Pace</p>
              <p className="text-sm font-bold">{today.pace}</p>
            </div>
            <div className="flex items-center justify-center">
              <div className="w-9 h-9 rounded-xl bg-[#FC5200] flex items-center justify-center">
                <Play size={16} className="text-white ml-0.5" fill="white" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stat cards grid */}
      {hasRuns && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <StatCard
              icon={<Activity size={13} className="text-[#FC5200]" />}
              label="Denne uken"
              value={metersToKm(computed.weeklyKm * 1000)}
              unit="km"
              sub={`${computed.weeklyRuns} løp`}
            />
            <StatCard
              icon={<Timer size={13} className="text-[#FC5200]" />}
              label="Snittempo"
              value={computed.avgPaceSecPerKm > 0 ? formatPace(computed.avgPaceSecPerKm) : "—"}
              unit="/km"
              sub="siste løp"
            />
            <StatCard
              icon={<TrendingUp size={13} className="text-[#FC5200]" />}
              label="Lengste løp"
              value={computed.longestRunKm.toFixed(1)}
              unit="km"
              sub="noen sinne"
            />
            <StatCard
              icon={<Zap size={13} className="text-[#FC5200]" />}
              label="Beste tempo"
              value={bestPace > 0 ? formatPace(bestPace) : "—"}
              unit="/km"
              sub={paceDelta > 5 ? "↑ Forbedring" : paceDelta < -5 ? "↓ Synkende" : "Stabilt"}
              subColor={paceDelta > 5 ? "text-emerald-500" : paceDelta < -5 ? "text-red-400" : "text-[#6B6B65]"}
            />
          </div>

          {/* Weekly km progress bar — full width below stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <WeeklyProgressBar runs={recentRuns} />
          </div>
        </>
      )}

      {/* Secondary stats */}
      {hasRuns && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard
            icon={<Heart size={13} className="text-red-400" />}
            label="Snitt puls"
            value={avgHR ? String(avgHR) : "—"}
            unit="bpm"
            sub="alle løp"
          />
          <StatCard
            icon={<Mountain size={13} className="text-blue-400" />}
            label="Høydemeter"
            value={String(Math.round(totalElevationMonth))}
            unit="m"
            sub="denne måneden"
          />
          <StatCard
            icon={<Activity size={13} className="text-emerald-500" />}
            label="Snittfart"
            value={avgSpeedKmh > 0 ? mpsToKmh(avgSpeedKmh / 3.6) : "—"}
            unit="km/t"
            sub="alle løp"
          />
          <StatCard
            icon={<TrendingUp size={13} className="text-purple-400" />}
            label="Tot. høyde YTD"
            value={ytdElevation > 0 ? String(ytdElevation) : "—"}
            unit="m"
            sub="i år"
          />
        </div>
      )}

      {/* Charts row */}
      {hasRuns && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Weekly km bar chart */}
          <div className="bg-white border border-[#E5E5E2] rounded-2xl p-5 hover:border-[#C8C8C4] transition-colors">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm">Ukentlig km</h3>
              <span className="text-xs text-[#6B6B65]">Siste 8 uker</span>
            </div>
            {weeklyBuckets.length > 0 ? (
              <BarChart
                data={weeklyBuckets.map((b) => ({ label: b.label, value: b.km }))}
              />
            ) : (
              <p className="text-xs text-[#6B6B65]">Trenger mer data</p>
            )}
          </div>

          {/* Pace trend chart */}
          <div className="bg-white border border-[#E5E5E2] rounded-2xl p-5 hover:border-[#C8C8C4] transition-colors">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm">Tempotrend</h3>
              <span className="text-xs text-[#6B6B65]">Siste 10 løp</span>
            </div>
            <PaceTrendChart runs={recentRuns} />
          </div>
        </div>
      )}

      {/* Zone distribution + recent runs */}
      {hasRuns && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Zone distribution */}
          <div className="bg-white border border-[#E5E5E2] rounded-2xl p-5 hover:border-[#C8C8C4] transition-colors">
            <ZoneDistributionChart
              runs={recentRuns}
              avgPaceSecPerKm={computed.avgPaceSecPerKm}
            />
          </div>

          {/* Recent runs list */}
          <div className="bg-white border border-[#E5E5E2] rounded-2xl p-5 hover:border-[#C8C8C4] transition-colors">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm">Siste løp</h3>
              <span className="text-xs text-[#6B6B65]">{recentRunCount} løp siste 4 uker</span>
            </div>
            <div className="space-y-2">
              {recentRuns.slice(0, 5).map((run, i) => (
                <div
                  key={run.id ?? i}
                  className="flex items-center justify-between py-2 border-b border-[#F0F0EE] last:border-0"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-[#F5F5F3] flex items-center justify-center shrink-0">
                      <Activity size={13} className="text-[#FC5200]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate">{run.name ?? "Løpetur"}</p>
                      <p className="text-[10px] text-[#6B6B65]">{formatDate(run.start_date_local)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-2">
                    <div className="text-right">
                      <p className="text-xs font-bold">{metersToKm(run.distance)} km</p>
                      <p className="text-[10px] text-[#6B6B65]">{activityPace(run)}/km</p>
                    </div>
                    <div className="text-right hidden sm:block">
                      <p className="text-xs font-medium text-[#6B6B65]">{formatMovingTime(run.moving_time)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {recentRuns.length > 5 && (
              <Link
                href="/activities"
                className="flex items-center justify-center gap-1 mt-3 text-xs font-semibold text-[#FC5200] hover:underline"
              >
                Se alle løp <ChevronRight size={12} />
              </Link>
            )}
          </div>
        </div>
      )}

      {/* All-time stats footer */}
      {hasRuns && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border border-[#E5E5E2] rounded-2xl p-4 text-center hover:border-[#C8C8C4] transition-colors">
            <p className="text-xl font-black">{computed.totalRunsAllTime}</p>
            <p className="text-xs text-[#6B6B65] font-medium mt-0.5">Totale løp</p>
          </div>
          <div className="bg-white border border-[#E5E5E2] rounded-2xl p-4 text-center hover:border-[#C8C8C4] transition-colors">
            <p className="text-xl font-black">{computed.totalKmAllTime.toFixed(0)}</p>
            <p className="text-xs text-[#6B6B65] font-medium mt-0.5">Total km</p>
          </div>
          <div className="bg-white border border-[#E5E5E2] rounded-2xl p-4 text-center hover:border-[#C8C8C4] transition-colors">
            <p className="text-xl font-black">{computed.ytdKm.toFixed(0)}</p>
            <p className="text-xs text-[#6B6B65] font-medium mt-0.5">Km i år</p>
          </div>
        </div>
      )}

      {/* Avg run distance */}
      {hasRuns && avgRunDistKm > 0 && (
        <div className="mt-3 bg-white border border-[#E5E5E2] rounded-2xl p-4 flex items-center justify-between hover:border-[#C8C8C4] transition-colors">
          <div className="flex items-center gap-2">
            <TrendingUp size={15} className="text-[#FC5200]" />
            <span className="text-sm font-semibold">Snitt løpsdistanse</span>
          </div>
          <span className="text-sm font-bold">{avgRunDistKm.toFixed(1)} km</span>
        </div>
      )}
    </div>
  );
}
