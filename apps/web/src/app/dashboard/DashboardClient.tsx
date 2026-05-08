"use client";

import Link from "next/link";
import {
  Brain,
  Calendar,
  TrendingUp,
  Zap,
  Activity,
  MessageCircle,
  ChevronRight,
  Play,
  RefreshCw,
} from "lucide-react";
import type { StoredStats } from "@/lib/strava-types";
import { formatPace } from "@/lib/strava-types";

const STRAVA_ORANGE = "#FC4C02";

// Training plan — stays AI-managed; will be replaced by generated plan from /api/generate-plan
const MOCK_PLAN = {
  raceDate: "2026-08-22",
  thisWeek: [
    { day: "Mon", type: "Easy Run", distance: "8 km", pace: "5:45/km", done: true },
    { day: "Tue", type: "Strength", distance: "45 min", pace: "Runner's circuits", done: true },
    { day: "Wed", type: "Threshold", distance: "10 km", pace: "4:50/km", done: false, today: true },
    { day: "Thu", type: "Rest", distance: "—", pace: "Recovery", done: false },
    { day: "Fri", type: "Easy Run", distance: "6 km", pace: "5:50/km", done: false },
    { day: "Sat", type: "Long Run", distance: "18 km", pace: "6:00/km", done: false },
    { day: "Sun", type: "Rest", distance: "—", pace: "Recovery", done: false },
  ],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function metersToKm(m: number) {
  return (m / 1000).toFixed(1);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function formatMovingTime(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function activityPace(activity: { distance: number; moving_time: number }) {
  if (!activity.distance || !activity.moving_time) return "—";
  const secPerKm = activity.moving_time / (activity.distance / 1000);
  return formatPace(secPerKm) + "/km";
}

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  stravaData: StoredStats;
  stravaStatus?: string | null;
}

export default function DashboardClient({ stravaData, stravaStatus }: Props) {
  const today = MOCK_PLAN.thisWeek.find((d) => d.today);
  const daysUntilRace = Math.ceil(
    (new Date(MOCK_PLAN.raceDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  const { computed, athlete, recentRuns, lastSync } = stravaData;
  const hasData = athlete !== null;
  const isStravaLinked = hasData || stravaStatus === "connected";

  const athleteName = athlete ? athlete.firstname : "Kevin";

  // Build live metrics (real data if synced, fallback labels otherwise)
  const metrics = hasData
    ? [
        {
          label: "Weekly km",
          value: computed.weeklyKm.toFixed(1),
          unit: "km",
          delta: `${computed.weeklyRuns} run${computed.weeklyRuns !== 1 ? "s" : ""}`,
          positive: true,
        },
        {
          label: "Avg pace",
          value: formatPace(computed.avgPaceSecPerKm),
          unit: "/km",
          delta: "Last 5 runs",
          positive: true,
        },
        {
          label: "YTD km",
          value: computed.ytdKm.toFixed(0),
          unit: "km",
          delta: `${computed.totalRunsAllTime} runs all-time`,
          positive: true,
        },
        {
          label: "Longest (30d)",
          value: computed.longestRunKm.toFixed(1),
          unit: "km",
          delta: "Last 30 days",
          positive: true,
        },
      ]
    : [
        { label: "Weekly km", value: "—", unit: "km", delta: "Sync Strava", positive: true },
        { label: "Avg pace", value: "—", unit: "/km", delta: "Sync Strava", positive: true },
        { label: "YTD km", value: "—", unit: "km", delta: "Sync Strava", positive: true },
        { label: "Longest (30d)", value: "—", unit: "km", delta: "Sync Strava", positive: true },
      ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 bottom-0 w-60 border-r border-[#1f1f1f] bg-[#0d0d0d] flex flex-col p-5 z-40">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-7 h-7 bg-[#22c55e] rounded-lg flex items-center justify-center">
            <span className="text-black font-bold text-xs">R</span>
          </div>
          <span className="font-semibold">RunAI</span>
        </div>

        <nav className="space-y-1 flex-1">
          {[
            { icon: Activity, label: "Dashboard", href: "/dashboard", active: true },
            { icon: Calendar, label: "Training Plan", href: "/dashboard/plan" },
            { icon: Brain, label: "AI Coach", href: "/dashboard/coach" },
            { icon: TrendingUp, label: "Progress", href: "/dashboard/progress" },
            { icon: Zap, label: "Strength", href: "/dashboard/strength" },
          ].map(({ icon: Icon, label, href, active }) => (
            <Link
              key={label}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                active
                  ? "bg-[#22c55e]/10 text-[#22c55e]"
                  : "text-[#71717a] hover:text-white hover:bg-[#141414]"
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-[#1f1f1f] pt-4">
          {/* Strava status */}
          {isStravaLinked ? (
            <div className="px-3 py-2 mb-3 rounded-xl bg-[#FC4C02]/10 border border-[#FC4C02]/20">
              <div className="flex items-center gap-2 mb-1">
                <StravaIcon />
                <span className="text-xs text-[#FC4C02] font-medium">Strava connected</span>
              </div>
              {lastSync && (
                <div className="text-[10px] text-[#52525b] pl-6">
                  Synced {new Date(lastSync).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                </div>
              )}
              <form action="/api/strava/sync" method="POST" className="mt-1.5 pl-6">
                <button
                  type="submit"
                  className="flex items-center gap-1 text-[10px] text-[#52525b] hover:text-[#FC4C02] transition-colors"
                >
                  <RefreshCw size={9} /> Sync now
                </button>
              </form>
            </div>
          ) : (
            <a
              href="/api/strava/connect"
              className="flex items-center gap-2 px-3 py-2 mb-3 rounded-xl border border-[#FC4C02]/30 hover:bg-[#FC4C02]/10 transition-colors group"
            >
              <StravaIcon />
              <span className="text-xs text-[#FC4C02] font-medium group-hover:underline">
                Connect Strava
              </span>
            </a>
          )}

          <div className="flex items-center gap-3 px-3">
            <div className="w-8 h-8 bg-[#22c55e] rounded-full flex items-center justify-center text-black font-bold text-sm">
              {athleteName[0]?.toUpperCase() ?? "K"}
            </div>
            <div>
              <div className="text-sm font-medium">{athleteName}</div>
              <div className="text-xs text-[#52525b]">Pro plan</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="ml-60 p-8">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">
              Good morning, {athleteName} 👋
            </h1>
            <p className="text-[#71717a] text-sm mt-1">{daysUntilRace} days until race day</p>
          </div>
          <Link
            href="/dashboard/coach"
            className="flex items-center gap-2 bg-[#141414] border border-[#1f1f1f] hover:border-[#22c55e]/40 px-4 py-2.5 rounded-xl text-sm transition-colors"
          >
            <MessageCircle size={14} className="text-[#22c55e]" />
            Ask your coach
          </Link>
        </div>

        {/* Today's workout */}
        {today && (
          <div className="bg-gradient-to-br from-[#22c55e]/10 to-[#16a34a]/5 border border-[#22c55e]/20 rounded-2xl p-6 mb-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs text-[#22c55e] font-medium uppercase tracking-wider mb-1">Today</div>
                <h2 className="text-xl font-bold mb-1">{today.type}</h2>
                <p className="text-[#a1a1aa] text-sm">
                  {today.distance} · Target pace {today.pace}
                </p>
              </div>
              <button className="flex items-center gap-2 bg-[#22c55e] text-black px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#16a34a] transition-colors">
                <Play size={14} /> Start
              </button>
            </div>
          </div>
        )}

        {/* Live metrics from Strava */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {metrics.map((m) => (
            <div key={m.label} className="bg-[#141414] border border-[#1f1f1f] rounded-2xl p-5">
              <div className="text-xs text-[#52525b] mb-2">{m.label}</div>
              <div className="flex items-end gap-1">
                <span className="text-2xl font-bold">{m.value}</span>
                {m.unit && <span className="text-xs text-[#71717a] mb-1">{m.unit}</span>}
              </div>
              <div className={`text-xs mt-1 ${m.positive ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
                {m.delta}
              </div>
            </div>
          ))}
        </div>

        {/* Plan + activities */}
        <div className="grid grid-cols-3 gap-6">
          {/* This week's plan */}
          <div className="col-span-2 space-y-6">
            <div className="bg-[#141414] border border-[#1f1f1f] rounded-2xl p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold">This Week</h3>
                <Link
                  href="/dashboard/plan"
                  className="text-xs text-[#22c55e] flex items-center gap-1 hover:underline"
                >
                  Full plan <ChevronRight size={12} />
                </Link>
              </div>
              <div className="space-y-2">
                {MOCK_PLAN.thisWeek.map((d) => (
                  <div
                    key={d.day}
                    className={`flex items-center gap-4 p-3 rounded-xl transition-colors ${
                      d.today
                        ? "bg-[#22c55e]/10 border border-[#22c55e]/20"
                        : "hover:bg-[#1c1c1c]"
                    }`}
                  >
                    <span className="text-xs font-medium text-[#52525b] w-7">{d.day}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${d.done ? "text-[#3f3f46] line-through" : "text-white"}`}>
                          {d.type}
                        </span>
                        {d.today && (
                          <span className="text-xs bg-[#22c55e]/20 text-[#22c55e] px-2 py-0.5 rounded-full">
                            Today
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-[#52525b]">{d.distance} · {d.pace}</span>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${d.done ? "bg-[#22c55e] border-[#22c55e]" : "border-[#3f3f46]"}`}>
                      {d.done && <span className="text-black text-xs">✓</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Strava activities */}
            {recentRuns.length > 0 && (
              <div className="bg-[#141414] border border-[#1f1f1f] rounded-2xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <StravaIcon />
                    <h3 className="font-semibold">Recent Runs</h3>
                  </div>
                  <span className="text-xs text-[#52525b]">from Strava</span>
                </div>
                <div className="space-y-2">
                  {recentRuns.slice(0, 6).map((run) => (
                    <div
                      key={run.id}
                      className="flex items-center gap-4 p-3 rounded-xl hover:bg-[#1c1c1c] transition-colors"
                    >
                      <span className="text-xs text-[#52525b] w-12 shrink-0">
                        {formatDate(run.start_date_local)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{run.name}</div>
                        <div className="text-xs text-[#52525b]">
                          {metersToKm(run.distance)} km · {activityPace(run)} · {formatMovingTime(run.moving_time)}
                        </div>
                      </div>
                      {run.average_heartrate && (
                        <span className="text-xs text-[#ef4444] shrink-0">
                          ♥ {Math.round(run.average_heartrate)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* AI Coach card */}
          <div className="bg-[#141414] border border-[#1f1f1f] rounded-2xl p-6 flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-[#22c55e]/10 rounded-xl flex items-center justify-center">
                <Brain size={16} className="text-[#22c55e]" />
              </div>
              <h3 className="font-semibold">AI Coach</h3>
            </div>
            <div className="flex-1 space-y-3 mb-4">
              <div className="bg-[#1c1c1c] rounded-xl p-3 text-xs text-[#a1a1aa] leading-relaxed">
                "Great threshold session Monday! Your pace was 4 seconds faster than target. I've nudged Wednesday's threshold up slightly to keep the stimulus."
              </div>
              <div className="bg-[#1c1c1c] rounded-xl p-3 text-xs text-[#a1a1aa] leading-relaxed">
                "Your long run on Saturday is the key session this week. Hit 6:00/km and we're on track for 1:52."
              </div>
            </div>
            <Link
              href="/dashboard/coach"
              className="flex items-center justify-center gap-2 w-full border border-[#22c55e]/30 text-[#22c55e] py-2.5 rounded-xl text-sm font-medium hover:bg-[#22c55e]/10 transition-colors"
            >
              <MessageCircle size={14} />
              Chat with coach
            </Link>
          </div>
        </div>
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
