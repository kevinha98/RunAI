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

const STRAVA_ORANGE = "#FC5200";
const P = "#FC5200";

// Treningsplan — administreres av AI; erstattes av generert plan fra /api/generate-plan
const MOCK_PLAN = {
  raceDate: "2026-08-22",
  thisWeek: [
    { day: "Man", type: "Lett løping", distance: "8 km", pace: "5:45/km", done: true },
    { day: "Tir", type: "Styrke", distance: "45 min", pace: "Løpeøvelser", done: true },
    { day: "Ons", type: "Terskeløkt", distance: "10 km", pace: "4:50/km", done: false, today: true },
    { day: "Tor", type: "Hvile", distance: "—", pace: "Restitusjon", done: false },
    { day: "Fre", type: "Lett løping", distance: "6 km", pace: "5:50/km", done: false },
    { day: "Lør", type: "Langkjøring", distance: "18 km", pace: "6:00/km", done: false },
    { day: "Søn", type: "Hvile", distance: "—", pace: "Restitusjon", done: false },
  ],
};

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function metersToKm(m: number) {
  return (m / 1000).toFixed(1);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("nb-NO", {
    day: "numeric",
    month: "short",
  });
}

function formatMovingTime(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}t ${m}m`;
  return `${m}m`;
}

function activityPace(activity: { distance: number; moving_time: number }) {
  if (!activity.distance || !activity.moving_time) return "—";
  const secPerKm = activity.moving_time / (activity.distance / 1000);
  return formatPace(secPerKm);
}

// â”€â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

  const metrics = hasData
    ? [
        { label: "Ukentlig km", value: computed.weeklyKm.toFixed(1), unit: "km", delta: `${computed.weeklyRuns} økt${computed.weeklyRuns !== 1 ? "er" : ""}`, positive: true },
        { label: "Snittfart", value: formatPace(computed.avgPaceSecPerKm), unit: "/km", delta: "Siste 5 løp", positive: true },
        { label: "Hittil i år", value: computed.ytdKm.toFixed(0), unit: "km", delta: `${computed.totalRunsAllTime} løp totalt`, positive: true },
        { label: "Lengste (30d)", value: computed.longestRunKm.toFixed(1), unit: "km", delta: "Siste 30 dager", positive: true },
      ]
    : [
        { label: "Ukentlig km", value: "—", unit: "km", delta: "Koble Strava", positive: true },
        { label: "Snittfart", value: "—", unit: "/km", delta: "Koble Strava", positive: true },
        { label: "Hittil i år", value: "—", unit: "km", delta: "Koble Strava", positive: true },
        { label: "Lengste (30d)", value: "—", unit: "km", delta: "Koble Strava", positive: true },
      ];

  return (
    <div className="min-h-screen bg-[#0D0D0C] text-[#F2F2F0]">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 bottom-0 w-60 border-r border-[#2E2E29] bg-[#111110] flex flex-col p-5 z-40">
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-7 h-7 bg-[#FC5200] rounded-lg flex items-center justify-center">
            <span className="text-white font-black text-xs">R</span>
          </div>
          <span className="font-bold">RunAI</span>
        </div>

        <nav className="space-y-0.5 flex-1">
          {[
            { icon: Activity, label: "Oversikt", href: "/dashboard", active: true },
            { icon: Calendar, label: "Treningsplan", href: "/dashboard/plan" },
            { icon: Brain, label: "AI-trener", href: "/dashboard/coach" },
            { icon: TrendingUp, label: "Fremgang", href: "/dashboard/progress" },
            { icon: Zap, label: "Styrke", href: "/dashboard/strength" },
          ].map(({ icon: Icon, label, href, active }) => (
            <Link
              key={label}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                active
                  ? "bg-[rgba(252,82,0,0.12)] text-[#FC5200] font-medium"
                  : "text-[#9A9A92] hover:text-[#F2F2F0] hover:bg-[#1A1A17]"
              }`}
            >
              <Icon size={15} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-[#2E2E29] pt-4">
          {isStravaLinked ? (
            <div className="px-3 py-2.5 mb-3 rounded-xl bg-[rgba(252,82,0,0.08)] border border-[rgba(252,82,0,0.20)]">
              <div className="flex items-center gap-2 mb-1">
                <StravaIcon />
                <span className="text-xs text-[#FC5200] font-semibold">Strava tilkoblet</span>
              </div>
              {lastSync && (
                <div className="text-[10px] text-[#5A5A54] pl-6">
                  Synkronisert {new Date(lastSync).toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" })}
                </div>
              )}
              <form action="/api/strava/sync" method="POST" className="mt-1.5 pl-6">
                <button type="submit" className="flex items-center gap-1 text-[10px] text-[#5A5A54] hover:text-[#FC5200] transition-colors">
                  <RefreshCw size={9} /> Synkroniser nå
                </button>
              </form>
            </div>
          ) : (
            <a
              href="/api/strava/connect"
              className="flex items-center gap-2 px-3 py-2.5 mb-3 rounded-xl border border-[rgba(252,82,0,0.30)] hover:bg-[rgba(252,82,0,0.08)] transition-colors group"
            >
              <StravaIcon />
              <span className="text-xs text-[#FC5200] font-semibold group-hover:underline">Koble til Strava</span>
            </a>
          )}

          <div className="flex items-center gap-3 px-3">
            <div className="w-8 h-8 bg-[#FC5200] rounded-full flex items-center justify-center text-white font-bold text-sm">
              {athleteName[0]?.toUpperCase() ?? "K"}
            </div>
            <div>
              <div className="text-sm font-semibold">{athleteName}</div>
              <div className="text-xs text-[#5A5A54]">Pro-plan</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="ml-60 p-8">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black tracking-tight">
              God dag, {athleteName} ðŸ‘‹
            </h1>
            <p className="text-[#9A9A92] text-sm mt-1">{daysUntilRace} dager til løpsdagen</p>
          </div>
          <Link
            href="/dashboard/coach"
            className="flex items-center gap-2 bg-[#1A1A17] border border-[#2E2E29] hover:border-[rgba(252,82,0,0.40)] px-4 py-2.5 rounded-xl text-sm transition-colors"
          >
            <MessageCircle size={14} className="text-[#FC5200]" />
            Spør treneren din
          </Link>
        </div>

        {/* Today's workout */}
        {today && (
          <div className="bg-gradient-to-br from-[rgba(252,82,0,0.10)] to-[rgba(252,82,0,0.04)] border border-[rgba(252,82,0,0.20)] rounded-2xl p-6 mb-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs text-[#FC5200] font-bold uppercase tracking-widest mb-1">I dag</div>
                <h2 className="text-xl font-black tracking-tight mb-1">{today.type}</h2>
                <p className="text-[#9A9A92] text-sm">
                  {today.distance} · Målfart {today.pace}
                </p>
              </div>
              <button className="flex items-center gap-2 bg-[#FC5200] text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-[#E04800] transition-colors">
                <Play size={14} /> Start
              </button>
            </div>
          </div>
        )}

        {/* Live metrics */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {metrics.map((m) => (
            <div key={m.label} className="bg-[#1A1A17] border border-[#2E2E29] rounded-2xl p-5 hover:border-[#3A3A35] transition-colors">
              <div className="text-xs text-[#5A5A54] mb-2 font-medium">{m.label}</div>
              <div className="flex items-end gap-1">
                <span className="text-2xl font-black tracking-tight">{m.value}</span>
                {m.unit && <span className="text-xs text-[#9A9A92] mb-1">{m.unit}</span>}
              </div>
              <div className={`text-xs mt-1 font-semibold ${m.positive ? "text-[#FC5200]" : "text-[#ef4444]"}`}>
                {m.delta}
              </div>
            </div>
          ))}
        </div>

        {/* Plan + activities + coach */}
        <div className="grid grid-cols-3 gap-6">
          {/* This week's plan */}
          <div className="col-span-2 space-y-6">
            <div className="bg-[#1A1A17] border border-[#2E2E29] rounded-2xl p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold">Denne uken</h3>
                <Link href="/dashboard/plan" className="text-xs text-[#FC5200] flex items-center gap-1 hover:underline font-semibold">
                  Full plan <ChevronRight size={12} />
                </Link>
              </div>
              <div className="space-y-1.5">
                {MOCK_PLAN.thisWeek.map((d) => (
                  <div
                    key={d.day}
                    className={`flex items-center gap-4 p-3 rounded-xl transition-colors ${
                      d.today
                        ? "bg-[rgba(252,82,0,0.08)] border border-[rgba(252,82,0,0.18)]"
                        : "hover:bg-[#222220]"
                    }`}
                  >
                    <span className="text-xs font-bold text-[#5A5A54] w-7">{d.day}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold ${d.done ? "text-[#3A3A35] line-through" : "text-[#F2F2F0]"}`}>
                          {d.type}
                        </span>
                        {d.today && (
                          <span className="text-xs bg-[rgba(252,82,0,0.15)] text-[#FC5200] px-2 py-0.5 rounded-full font-bold">
                            I dag
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-[#5A5A54]">{d.distance} · {d.pace}</span>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${d.done ? "bg-[#FC5200] border-[#FC5200]" : "border-[#3A3A35]"}`}>
                      {d.done && <span className="text-white text-xs font-bold">âœ“</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Strava activities */}
            {recentRuns.length > 0 && (
              <div className="bg-[#1A1A17] border border-[#2E2E29] rounded-2xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <StravaIcon />
                    <h3 className="font-bold">Siste løp</h3>
                  </div>
                  <span className="text-xs text-[#5A5A54]">fra Strava</span>
                </div>
                <div className="space-y-1.5">
                  {recentRuns.slice(0, 6).map((run) => (
                    <div
                      key={run.id}
                      className="flex items-center gap-4 p-3 rounded-xl hover:bg-[#222220] transition-colors"
                    >
                      <span className="text-xs text-[#5A5A54] w-12 shrink-0">
                        {formatDate(run.start_date_local)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">{run.name}</div>
                        <div className="text-xs text-[#5A5A54]">
                          {metersToKm(run.distance)} km · {activityPace(run)} · {formatMovingTime(run.moving_time)}
                        </div>
                      </div>
                      {run.average_heartrate && (
                        <span className="text-xs text-[#ef4444] shrink-0 font-semibold">
                          â™¥ {Math.round(run.average_heartrate)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* AI Coach card */}
          <div className="bg-[#1A1A17] border border-[#2E2E29] rounded-2xl p-6 flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-[rgba(252,82,0,0.10)] rounded-xl flex items-center justify-center">
                <Brain size={16} className="text-[#FC5200]" />
              </div>
              <h3 className="font-bold">AI-trener</h3>
            </div>
            <div className="flex-1 space-y-3 mb-5">
              <div className="bg-[#222220] rounded-xl p-3.5 text-xs text-[#9A9A92] leading-relaxed">
                &ldquo;Flott terskeløkt mandag! Farten var 4 sekunder raskere enn mål. Jeg har justert onsdagens økt litt opp for å opprettholde stimulansen.&rdquo;
              </div>
              <div className="bg-[#222220] rounded-xl p-3.5 text-xs text-[#9A9A92] leading-relaxed">
                &ldquo;Langkjøringen lørdag er nøkkeløkten denne uken. Hold 6:00/km, og vi er på vei mot 1:52.&rdquo;
              </div>
            </div>
            <Link
              href="/dashboard/coach"
              className="flex items-center justify-center gap-2 w-full border border-[rgba(252,82,0,0.30)] text-[#FC5200] py-3 rounded-xl text-sm font-bold hover:bg-[rgba(252,82,0,0.08)] transition-colors"
            >
              <MessageCircle size={14} />
              Chat med treneren
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

