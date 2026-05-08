import Link from "next/link";
import {
  Brain,
  MessageCircle,
  ChevronRight,
  Play,
  Activity,
  Calendar,
  TrendingUp,
  Zap,
} from "lucide-react";
import type { StoredStats } from "@/lib/strava-types";
import { formatPace } from "@/lib/strava-types";

const STRAVA_ORANGE = "#FC5200";

// --- Mock plan — ersettes av generert plan fra /api/generate-plan -----------

const RACE_DATE = "2026-08-22";

const PLAN_SESSIONS = [
  { day: "Man", dayIdx: 1, type: "Lett løping", distance: "8 km", pace: "5:45/km" },
  { day: "Tir", dayIdx: 2, type: "Styrke", distance: "45 min", pace: "Løpeøvelser" },
  { day: "Ons", dayIdx: 3, type: "Terskelløkt", distance: "10 km", pace: "4:50/km" },
  { day: "Tor", dayIdx: 4, type: "Hvile", distance: "—", pace: "Restitusjon" },
  { day: "Fre", dayIdx: 5, type: "Lett løping", distance: "6 km", pace: "5:50/km" },
  { day: "Lør", dayIdx: 6, type: "Langkjøring", distance: "18 km", pace: "6:00/km" },
  { day: "Søn", dayIdx: 0, type: "Hvile", distance: "—", pace: "Restitusjon" },
];

// --- Helpers ----------------------------------------------------------------

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

// --- Component --------------------------------------------------------------

interface Props {
  stravaData: StoredStats;
  stravaStatus?: string | null;
}

export default function DashboardClient({ stravaData, stravaStatus: _stravaStatus }: Props) {
  // Detect today dynamically: 0=Sun, 1=Mon, ..., 6=Sat
  const todayIdx = new Date().getDay();

  const thisWeek = PLAN_SESSIONS.map((d) => ({
    ...d,
    today: d.dayIdx === todayIdx,
    // Mark done if the weekday (1-6) has already passed this week
    done: todayIdx === 0 ? d.dayIdx !== 0 : d.dayIdx > 0 && d.dayIdx < todayIdx,
  }));

  const today = thisWeek.find((d) => d.today);

  const daysUntilRace = Math.ceil(
    (new Date(RACE_DATE).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  const { computed, athlete, recentRuns } = stravaData;
  const hasData = athlete !== null;
  const athleteName = athlete?.firstname ?? null;

  const metrics = hasData
    ? [
        {
          label: "Ukentlig km",
          value: computed.weeklyKm.toFixed(1),
          unit: "km",
          delta: `${computed.weeklyRuns} økt${computed.weeklyRuns !== 1 ? "er" : ""}`,
          positive: true,
        },
        {
          label: "Snittfart",
          value: formatPace(computed.avgPaceSecPerKm),
          unit: "/km",
          delta: "Siste 5 løp",
          positive: true,
        },
        {
          label: "Hittil i år",
          value: computed.ytdKm.toFixed(0),
          unit: "km",
          delta: `${computed.totalRunsAllTime} løp totalt`,
          positive: true,
        },
        {
          label: "Lengste (30d)",
          value: computed.longestRunKm.toFixed(1),
          unit: "km",
          delta: "Siste 30 dager",
          positive: true,
        },
      ]
    : [
        { label: "Ukentlig km", value: "—", unit: "km", delta: "Koble Strava", positive: true },
        { label: "Snittfart", value: "—", unit: "/km", delta: "Koble Strava", positive: true },
        { label: "Hittil i år", value: "—", unit: "km", delta: "Koble Strava", positive: true },
        { label: "Lengste (30d)", value: "—", unit: "km", delta: "Koble Strava", positive: true },
      ];

  return (
    <div className="flex-1 md:ml-60 p-4 md:p-8 pb-24 md:pb-8">
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

      {/* Top bar */}
      <div className="hidden md:flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black tracking-tight">
            {athleteName ? `God dag, ${athleteName} \ud83d\udc4b` : "God dag \ud83d\udc4b"}
          </h1>
          <p className="text-[#6B6B65] text-sm mt-1">{daysUntilRace} dager til løpsdagen</p>
        </div>
        <Link
          href="/dashboard/coach"
          className="flex items-center gap-2 bg-white border border-[#E5E5E2] hover:border-[rgba(252,82,0,0.40)] px-4 py-2.5 rounded-xl text-sm transition-colors"
        >
          <MessageCircle size={14} className="text-[#FC5200]" />
          Spør treneren din
        </Link>
      </div>

      {/* Today's workout */}
      {today && today.type !== "Hvile" && (
        <div className="bg-gradient-to-br from-[rgba(252,82,0,0.10)] to-[rgba(252,82,0,0.04)] border border-[rgba(252,82,0,0.20)] rounded-2xl p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-[#FC5200] font-bold uppercase tracking-widest mb-1">I dag</div>
              <h2 className="text-xl font-black tracking-tight mb-1">{today.type}</h2>
              <p className="text-[#6B6B65] text-sm">
                {today.distance} &middot; Målfart {today.pace}
              </p>
            </div>
            <Link
              href="/dashboard/plan"
              className="flex items-center gap-2 bg-[#FC5200] text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-[#E04800] transition-colors"
            >
              <Play size={14} /> Vis økt
            </Link>
          </div>
        </div>
      )}

      {/* Rest day notice */}
      {today && today.type === "Hvile" && (
        <div className="border border-[#E5E5E2] rounded-2xl p-5 mb-6 flex items-center gap-4 bg-[#F8F8F6]">
          <span className="text-2xl">\ud83d\udece</span>
          <div>
            <div className="text-sm font-semibold">Hviledag i dag</div>
            <div className="text-xs text-[#6B6B65] mt-0.5">Restitusjon er en del av treningen</div>
          </div>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="bg-white border border-[#E5E5E2] rounded-2xl p-5 hover:border-[#C8C8C4] transition-colors"
          >
            <div className="text-xs text-[#6B6B65] mb-2 font-medium">{m.label}</div>
            <div className="flex items-end gap-1">
              <span className="text-2xl font-black tracking-tight">{m.value}</span>
              {m.unit && <span className="text-xs text-[#6B6B65] mb-1">{m.unit}</span>}
            </div>
            <div className={`text-xs mt-1 font-semibold ${m.positive ? "text-[#FC5200]" : "text-[#ef4444]"}`}>
              {m.delta}
            </div>
          </div>
        ))}
      </div>

      {/* Plan + activities + coach */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {/* This week's plan */}
        <div className="md:col-span-2 space-y-4 md:space-y-6">
          <div className="bg-[#FFFFFF] border border-[#E5E5E2] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold">Denne uken</h3>
              <Link
                href="/dashboard/plan"
                className="text-xs text-[#FC5200] flex items-center gap-1 hover:underline font-semibold"
              >
                Full plan <ChevronRight size={12} />
              </Link>
            </div>
            <div className="space-y-1.5">
              {thisWeek.map((d) => (
                <div
                  key={d.day}
                  className={`flex items-center gap-4 p-3 rounded-xl transition-colors ${
                    d.today
                      ? "bg-[rgba(252,82,0,0.07)] border border-[rgba(252,82,0,0.18)]"
                      : "hover:bg-[#F2F2F0]"
                  }`}
                >
                  <span className="text-xs font-bold text-[#6B6B65] w-7">{d.day}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-semibold ${
                          d.done ? "text-[#C8C8C4] line-through" : "text-[#111110]"
                        }`}
                      >
                        {d.type}
                      </span>
                      {d.today && (
                        <span className="text-xs bg-[rgba(252,82,0,0.12)] text-[#FC5200] px-2 py-0.5 rounded-full font-bold">
                          I dag
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-[#6B6B65]">
                      {d.distance} &middot; {d.pace}
                    </span>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      d.done ? "bg-[#FC5200] border-[#FC5200]" : "border-[#C8C8C4]"
                    }`}
                  >
                    {d.done && (
                      <span className="text-white text-xs font-bold">&#10003;</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Strava activities */}
          {recentRuns.length > 0 && (
            <div className="bg-[#FFFFFF] border border-[#E5E5E2] rounded-2xl p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <StravaIcon />
                  <h3 className="font-bold">Siste løp</h3>
                </div>
                <Link
                  href="/dashboard/progress"
                  className="text-xs text-[#FC5200] flex items-center gap-1 hover:underline font-semibold"
                >
                  Se fremgang <ChevronRight size={12} />
                </Link>
              </div>
              <div className="space-y-1.5">
                {recentRuns.slice(0, 6).map((run) => (
                  <div
                    key={run.id}
                    className="flex items-center gap-4 p-3 rounded-xl hover:bg-[#F2F2F0] transition-colors"
                  >
                    <span className="text-xs text-[#6B6B65] w-12 shrink-0">
                      {formatDate(run.start_date_local)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{run.name}</div>
                      <div className="text-xs text-[#6B6B65]">
                        {metersToKm(run.distance)} km &middot; {activityPace(run)} &middot;{" "}
                        {formatMovingTime(run.moving_time)}
                      </div>
                    </div>
                    {run.average_heartrate && (
                      <span className="text-xs text-[#ef4444] shrink-0 font-semibold">
                        &#9829; {Math.round(run.average_heartrate)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Prompt to connect Strava if no data */}
          {!hasData && (
            <div className="bg-[#FFFFFF] border border-[#E5E5E2] rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <StravaIcon />
                <h3 className="font-bold">Koble Strava for løpsdata</h3>
              </div>
              <p className="text-sm text-[#6B6B65] mb-4">
                Koble til Strava for å se aktivitetshistorikk, fart og fremgang.
              </p>
              <a
                href="/api/strava/connect"
                className="inline-flex items-center gap-2 bg-[#FC5200] text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-[#E04800] transition-colors"
              >
                Koble til Strava
              </a>
            </div>
          )}
        </div>

        {/* AI Coach card */}
        <div className="bg-[#FFFFFF] border border-[#E5E5E2] rounded-2xl p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-[rgba(252,82,0,0.10)] rounded-xl flex items-center justify-center">
              <Brain size={16} className="text-[#FC5200]" />
            </div>
            <h3 className="font-bold">AI-trener</h3>
          </div>
          <div className="flex-1 space-y-3 mb-5">
            <div className="bg-[#F2F2F0] rounded-xl p-3.5 text-xs text-[#6B6B65] leading-relaxed">
              &ldquo;Flott terskelløkt mandag! Farten var 4 sekunder raskere enn mål.
              Jeg har justert onsdagens økt litt opp for å opprettholde stimulansen.&rdquo;
            </div>
            <div className="bg-[#F2F2F0] rounded-xl p-3.5 text-xs text-[#6B6B65] leading-relaxed">
              &ldquo;Langkjøringen lørdag er nøkkeløkten denne uken. Hold 6:00/km,
              og vi er på vei mot 1:52.&rdquo;
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
  );
}

function StravaIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill={STRAVA_ORANGE}>
      <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
    </svg>
  );
}
