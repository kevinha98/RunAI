import DashboardSidebar from "../DashboardSidebar";
import { readStats } from "@/lib/stats-store";
import { Calendar, CheckCircle, Clock, Zap, Activity, Heart } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Treningsplan" };

// --- Full 12-week half marathon plan (mock) ---------------------------------

type Phase = "Grunntrening" | "Bygging" | "Topp" | "Nedtrapping";

interface Session {
  day: string;
  type: string;
  distance: string;
  pace: string;
  icon: string;
}

interface Week {
  week: number;
  phase: Phase;
  totalKm: number;
  sessions: Session[];
}

const SESSION_ICONS: Record<string, string> = {
  "Lett l\u00f8ping": "🏃",
  Styrke: "💪",
  "Terskell\u00f8kt": "⚡",
  Intervall: "🔥",
  "Langkj\u00f8ring": "🛣️",
  Hvile: "😴",
  Mobilitet: "🧘",
};

const WEEKS: Week[] = [
  {
    week: 1, phase: "Grunntrening", totalKm: 32,
    sessions: [
      { day: "Man", type: "Lett l\u00f8ping", distance: "6 km", pace: "6:00/km", icon: "🏃" },
      { day: "Tir", type: "Styrke", distance: "30 min", pace: "Kjerneaktivering", icon: "💪" },
      { day: "Ons", type: "Lett l\u00f8ping", distance: "8 km", pace: "5:55/km", icon: "🏃" },
      { day: "Tor", type: "Hvile", distance: "\u2014", pace: "Restitusjon", icon: "😴" },
      { day: "Fre", type: "Lett l\u00f8ping", distance: "6 km", pace: "6:00/km", icon: "🏃" },
      { day: "L\u00f8r", type: "Langkj\u00f8ring", distance: "12 km", pace: "6:10/km", icon: "🛣️" },
      { day: "S\u00f8n", type: "Hvile", distance: "\u2014", pace: "Restitusjon", icon: "😴" },
    ],
  },
  {
    week: 2, phase: "Grunntrening", totalKm: 36,
    sessions: [
      { day: "Man", type: "Lett l\u00f8ping", distance: "7 km", pace: "5:55/km", icon: "🏃" },
      { day: "Tir", type: "Styrke", distance: "35 min", pace: "Bein og hofte", icon: "💪" },
      { day: "Ons", type: "Terskell\u00f8kt", distance: "8 km", pace: "5:05/km", icon: "⚡" },
      { day: "Tor", type: "Hvile", distance: "\u2014", pace: "Restitusjon", icon: "😴" },
      { day: "Fre", type: "Lett l\u00f8ping", distance: "6 km", pace: "6:00/km", icon: "🏃" },
      { day: "L\u00f8r", type: "Langkj\u00f8ring", distance: "15 km", pace: "6:05/km", icon: "🛣️" },
      { day: "S\u00f8n", type: "Mobilitet", distance: "20 min", pace: "Dynamisk", icon: "🧘" },
    ],
  },
  {
    week: 3, phase: "Grunntrening", totalKm: 40,
    sessions: [
      { day: "Man", type: "Lett l\u00f8ping", distance: "8 km", pace: "5:50/km", icon: "🏃" },
      { day: "Tir", type: "Styrke", distance: "40 min", pace: "Full kropp", icon: "💪" },
      { day: "Ons", type: "Terskell\u00f8kt", distance: "10 km", pace: "5:00/km", icon: "⚡" },
      { day: "Tor", type: "Hvile", distance: "\u2014", pace: "Restitusjon", icon: "😴" },
      { day: "Fre", type: "Lett l\u00f8ping", distance: "6 km", pace: "5:55/km", icon: "🏃" },
      { day: "L\u00f8r", type: "Langkj\u00f8ring", distance: "16 km", pace: "6:00/km", icon: "🛣️" },
      { day: "S\u00f8n", type: "Hvile", distance: "\u2014", pace: "Restitusjon", icon: "😴" },
    ],
  },
  {
    week: 4, phase: "Grunntrening", totalKm: 32,
    sessions: [
      { day: "Man", type: "Lett l\u00f8ping", distance: "6 km", pace: "6:00/km", icon: "🏃" },
      { day: "Tir", type: "Mobilitet", distance: "25 min", pace: "Aktiv restitusjon", icon: "🧘" },
      { day: "Ons", type: "Lett l\u00f8ping", distance: "8 km", pace: "5:55/km", icon: "🏃" },
      { day: "Tor", type: "Hvile", distance: "\u2014", pace: "Restitusjon", icon: "😴" },
      { day: "Fre", type: "Lett l\u00f8ping", distance: "6 km", pace: "6:05/km", icon: "🏃" },
      { day: "L\u00f8r", type: "Langkj\u00f8ring", distance: "12 km", pace: "6:10/km", icon: "🛣️" },
      { day: "S\u00f8n", type: "Hvile", distance: "\u2014", pace: "Restitusjon", icon: "😴" },
    ],
  },
  {
    week: 5, phase: "Bygging", totalKm: 44,
    sessions: [
      { day: "Man", type: "Lett l\u00f8ping", distance: "8 km", pace: "5:45/km", icon: "🏃" },
      { day: "Tir", type: "Styrke", distance: "45 min", pace: "L\u00f8pe\u00f8velser", icon: "💪" },
      { day: "Ons", type: "Terskell\u00f8kt", distance: "10 km", pace: "4:50/km", icon: "⚡" },
      { day: "Tor", type: "Hvile", distance: "\u2014", pace: "Restitusjon", icon: "😴" },
      { day: "Fre", type: "Lett l\u00f8ping", distance: "6 km", pace: "5:50/km", icon: "🏃" },
      { day: "L\u00f8r", type: "Langkj\u00f8ring", distance: "18 km", pace: "6:00/km", icon: "🛣️" },
      { day: "S\u00f8n", type: "Hvile", distance: "\u2014", pace: "Restitusjon", icon: "😴" },
    ],
  },
  {
    week: 6, phase: "Bygging", totalKm: 48,
    sessions: [
      { day: "Man", type: "Lett l\u00f8ping", distance: "9 km", pace: "5:45/km", icon: "🏃" },
      { day: "Tir", type: "Intervall", distance: "10 km", pace: "4:30/km", icon: "🔥" },
      { day: "Ons", type: "Terskell\u00f8kt", distance: "10 km", pace: "4:48/km", icon: "⚡" },
      { day: "Tor", type: "Styrke", distance: "40 min", pace: "Bein og kjernen", icon: "💪" },
      { day: "Fre", type: "Lett l\u00f8ping", distance: "7 km", pace: "5:50/km", icon: "🏃" },
      { day: "L\u00f8r", type: "Langkj\u00f8ring", distance: "19 km", pace: "5:55/km", icon: "🛣️" },
      { day: "S\u00f8n", type: "Hvile", distance: "\u2014", pace: "Restitusjon", icon: "😴" },
    ],
  },
  {
    week: 7, phase: "Bygging", totalKm: 50,
    sessions: [
      { day: "Man", type: "Lett l\u00f8ping", distance: "9 km", pace: "5:40/km", icon: "🏃" },
      { day: "Tir", type: "Terskell\u00f8kt", distance: "12 km", pace: "4:45/km", icon: "⚡" },
      { day: "Ons", type: "Styrke", distance: "45 min", pace: "Full kropp", icon: "💪" },
      { day: "Tor", type: "Lett l\u00f8ping", distance: "7 km", pace: "5:50/km", icon: "🏃" },
      { day: "Fre", type: "Hvile", distance: "\u2014", pace: "Restitusjon", icon: "😴" },
      { day: "L\u00f8r", type: "Langkj\u00f8ring", distance: "20 km", pace: "5:55/km", icon: "🛣️" },
      { day: "S\u00f8n", type: "Mobilitet", distance: "20 min", pace: "Aktiv hvile", icon: "🧘" },
    ],
  },
  {
    week: 8, phase: "Bygging", totalKm: 40,
    sessions: [
      { day: "Man", type: "Lett l\u00f8ping", distance: "7 km", pace: "5:50/km", icon: "🏃" },
      { day: "Tir", type: "Terskell\u00f8kt", distance: "8 km", pace: "4:50/km", icon: "⚡" },
      { day: "Ons", type: "Mobilitet", distance: "25 min", pace: "Aktiv restitusjon", icon: "🧘" },
      { day: "Tor", type: "Hvile", distance: "\u2014", pace: "Restitusjon", icon: "😴" },
      { day: "Fre", type: "Lett l\u00f8ping", distance: "6 km", pace: "5:55/km", icon: "🏃" },
      { day: "L\u00f8r", type: "Langkj\u00f8ring", distance: "14 km", pace: "6:05/km", icon: "🛣️" },
      { day: "S\u00f8n", type: "Hvile", distance: "\u2014", pace: "Restitusjon", icon: "😴" },
    ],
  },
  {
    week: 9, phase: "Topp", totalKm: 54,
    sessions: [
      { day: "Man", type: "Lett l\u00f8ping", distance: "9 km", pace: "5:40/km", icon: "🏃" },
      { day: "Tir", type: "Intervall", distance: "11 km", pace: "4:25/km", icon: "🔥" },
      { day: "Ons", type: "Terskell\u00f8kt", distance: "12 km", pace: "4:42/km", icon: "⚡" },
      { day: "Tor", type: "Styrke", distance: "45 min", pace: "Bein og hofte", icon: "💪" },
      { day: "Fre", type: "Lett l\u00f8ping", distance: "8 km", pace: "5:45/km", icon: "🏃" },
      { day: "L\u00f8r", type: "Langkj\u00f8ring", distance: "21 km", pace: "5:50/km", icon: "🛣️" },
      { day: "S\u00f8n", type: "Hvile", distance: "\u2014", pace: "Restitusjon", icon: "😴" },
    ],
  },
  {
    week: 10, phase: "Topp", totalKm: 56,
    sessions: [
      { day: "Man", type: "Lett l\u00f8ping", distance: "10 km", pace: "5:40/km", icon: "🏃" },
      { day: "Tir", type: "Intervall", distance: "12 km", pace: "4:22/km", icon: "🔥" },
      { day: "Ons", type: "Terskell\u00f8kt", distance: "12 km", pace: "4:40/km", icon: "⚡" },
      { day: "Tor", type: "Hvile", distance: "\u2014", pace: "Restitusjon", icon: "😴" },
      { day: "Fre", type: "Lett l\u00f8ping", distance: "8 km", pace: "5:45/km", icon: "🏃" },
      { day: "L\u00f8r", type: "Langkj\u00f8ring", distance: "22 km", pace: "5:48/km", icon: "🛣️" },
      { day: "S\u00f8n", type: "Mobilitet", distance: "20 min", pace: "Aktiv hvile", icon: "🧘" },
    ],
  },
  {
    week: 11, phase: "Nedtrapping", totalKm: 42,
    sessions: [
      { day: "Man", type: "Lett l\u00f8ping", distance: "8 km", pace: "5:45/km", icon: "🏃" },
      { day: "Tir", type: "Terskell\u00f8kt", distance: "8 km", pace: "4:42/km", icon: "⚡" },
      { day: "Ons", type: "Styrke", distance: "30 min", pace: "Lett", icon: "💪" },
      { day: "Tor", type: "Hvile", distance: "\u2014", pace: "Restitusjon", icon: "😴" },
      { day: "Fre", type: "Lett l\u00f8ping", distance: "6 km", pace: "5:50/km", icon: "🏃" },
      { day: "L\u00f8r", type: "Langkj\u00f8ring", distance: "16 km", pace: "5:55/km", icon: "🛣️" },
      { day: "S\u00f8n", type: "Hvile", distance: "\u2014", pace: "Restitusjon", icon: "😴" },
    ],
  },
  {
    week: 12, phase: "Nedtrapping", totalKm: 28,
    sessions: [
      { day: "Man", type: "Lett l\u00f8ping", distance: "6 km", pace: "5:50/km", icon: "🏃" },
      { day: "Tir", type: "Lett l\u00f8ping", distance: "5 km", pace: "5:55/km", icon: "🏃" },
      { day: "Ons", type: "Mobilitet", distance: "20 min", pace: "Lett", icon: "🧘" },
      { day: "Tor", type: "Hvile", distance: "\u2014", pace: "Restitusjon", icon: "😴" },
      { day: "Fre", type: "Lett l\u00f8ping", distance: "4 km", pace: "6:00/km", icon: "🏃" },
      { day: "L\u00f8r", type: "Hvile", distance: "\u2014", pace: "Forberedelse", icon: "😴" },
      { day: "S\u00f8n", type: "L\u00d8P!", distance: "21,1 km", pace: "M\u00e5lfart!", icon: "🏅" },
    ],
  },
];

const CURRENT_WEEK = 5;

const PHASE_COLORS: Record<Phase, string> = {
  Grunntrening: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  Bygging: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  Topp: "text-[#FC5200] bg-[rgba(252,82,0,0.10)] border-[rgba(252,82,0,0.25)]",
  Nedtrapping: "text-amber-400 bg-amber-500/10 border-amber-500/20",
};

export default async function PlanPage() {
  const stats = await Promise.resolve(readStats());

  return (
    <div className="min-h-screen bg-[#0D0D0C] text-[#F2F2F0] flex">
      <DashboardSidebar stats={stats} activePath="/dashboard/plan" />

      <div className="flex-1 ml-60 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2.5">
              <Calendar size={22} className="text-[#FC5200]" />
              Treningsplan
            </h1>
            <p className="text-[#9A9A92] text-sm mt-1">
              12-ukers halvmaratonplan &middot; Uke {CURRENT_WEEK} av 12
            </p>
          </div>
          <Link
            href="/onboarding"
            className="text-xs text-[#9A9A92] border border-[#2E2E29] hover:border-[rgba(252,82,0,0.40)] hover:text-[#FC5200] px-4 py-2.5 rounded-xl transition-colors"
          >
            Generer ny plan
          </Link>
        </div>

        {/* Phase legend */}
        <div className="flex items-center gap-3 mb-8 flex-wrap">
          {(Object.keys(PHASE_COLORS) as Phase[]).map((phase) => (
            <span
              key={phase}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${PHASE_COLORS[phase]}`}
            >
              {phase}
            </span>
          ))}
        </div>

        {/* Week cards */}
        <div className="space-y-4">
          {WEEKS.map((w) => {
            const isCurrent = w.week === CURRENT_WEEK;
            const isPast = w.week < CURRENT_WEEK;

            return (
              <div
                key={w.week}
                className={`rounded-2xl border transition-colors ${
                  isCurrent
                    ? "border-[rgba(252,82,0,0.30)] bg-[#1A1A17]"
                    : "border-[#2E2E29] bg-[#111110]"
                }`}
              >
                {/* Week header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#2E2E29]">
                  <div className="flex items-center gap-3">
                    {isPast ? (
                      <CheckCircle size={15} className="text-emerald-400" />
                    ) : (
                      <span
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${
                          isCurrent ? "border-[#FC5200] text-[#FC5200]" : "border-[#3A3A35] text-[#5A5A54]"
                        }`}
                      >
                        {w.week}
                      </span>
                    )}
                    <div>
                      <span className="font-bold text-sm">
                        Uke {w.week}
                        {isCurrent && (
                          <span className="ml-2 text-xs bg-[rgba(252,82,0,0.15)] text-[#FC5200] px-2 py-0.5 rounded-full font-bold">
                            N\u00e5
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${PHASE_COLORS[w.phase]}`}
                    >
                      {w.phase}
                    </span>
                    <span className="text-sm text-[#9A9A92] font-semibold">{w.totalKm} km</span>
                  </div>
                </div>

                {/* Sessions — only show for current week expanded, others collapsed */}
                {(isCurrent || isPast) && (
                  <div className="grid grid-cols-7 divide-x divide-[#2E2E29]">
                    {w.sessions.map((s) => (
                      <div key={s.day} className="p-3 text-center">
                        <div className="text-[10px] font-bold text-[#5A5A54] mb-1">{s.day}</div>
                        <div className="text-lg mb-1">{s.icon}</div>
                        <div
                          className={`text-[10px] font-semibold leading-tight ${
                            s.type === "Hvile" ? "text-[#3A3A35]" : "text-[#F2F2F0]"
                          }`}
                        >
                          {s.type}
                        </div>
                        <div className="text-[10px] text-[#5A5A54] mt-0.5">{s.distance}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Future weeks — compact summary */}
                {!isCurrent && !isPast && (
                  <div className="px-5 py-3 flex items-center gap-2 text-xs text-[#5A5A54]">
                    <Clock size={11} />
                    {w.sessions.filter((s) => s.type !== "Hvile" && s.type !== "Mobilitet").length} trenings\u00f8kter
                    &middot;
                    <Activity size={11} />
                    {w.totalKm} km planlagt
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Race day card */}
        <div className="mt-6 bg-gradient-to-br from-[rgba(252,82,0,0.12)] to-[rgba(252,82,0,0.04)] border border-[rgba(252,82,0,0.30)] rounded-2xl p-6 text-center">
          <div className="text-3xl mb-2">🏅</div>
          <h3 className="font-black text-lg tracking-tight">L\u00f8psdag — 22. august 2026</h3>
          <p className="text-sm text-[#9A9A92] mt-1">M\u00e5l: sub 2:00 halvmaraton</p>
        </div>
      </div>
    </div>
  );
}
