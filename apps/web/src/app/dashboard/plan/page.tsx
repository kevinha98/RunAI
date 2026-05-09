import DashboardSidebar from "../DashboardSidebar";
import { readUserStats } from "@/lib/stats-store";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Calendar } from "lucide-react";
import Link from "next/link";
import { WEEKS, getCurrentWeek } from "@/lib/plan-data";
import type { Phase } from "@/lib/plan-data";

export const metadata = { title: "Treningsplan" };

const PHASE_COLORS: Record<Phase, string> = {
  Grunntrening: "text-emerald-700 bg-emerald-50 border-emerald-200",
  Bygging: "text-blue-700 bg-blue-50 border-blue-200",
  Topp: "text-orange-700 bg-orange-50 border-orange-200",
  Nedtrapping: "text-amber-700 bg-amber-50 border-amber-200",
};

export default async function PlanPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const stats = await readUserStats(user.id);
  const currentWeek = getCurrentWeek();

  return (
    <div className="min-h-screen bg-[#F5F5F3] text-[#111110] flex">
      <DashboardSidebar stats={stats} activePath="/dashboard/plan" />

      <div className="flex-1 md:ml-60 p-4 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2.5">
              <Calendar size={22} className="text-[#FC5200]" />
              Treningsplan
            </h1>
            <p className="text-[#6B6B65] text-sm mt-1">
              Bergen City Marathon 24. april 2027 &middot; {WEEKS.length} uker totalt
            </p>
          </div>
          <Link
            href="/onboarding"
            className="text-xs text-[#6B6B65] border border-[#E5E5E2] hover:border-[rgba(252,82,0,0.40)] hover:text-[#FC5200] px-4 py-2.5 rounded-xl transition-colors"
          >
            Generer ny plan
          </Link>
        </div>

        {/* Phase legend */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          {(Object.keys(PHASE_COLORS) as Phase[]).map((phase) => (
            <span
              key={phase}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${PHASE_COLORS[phase]}`}
            >
              {phase}
            </span>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-2xl border border-[#E5E5E2] bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E5E2] bg-[#FAFAF8]">
                <th className="text-left px-5 py-3.5 font-bold text-[#6B6B65] text-xs uppercase tracking-wider w-20">
                  Uke
                </th>
                <th className="text-left px-5 py-3.5 font-bold text-[#6B6B65] text-xs uppercase tracking-wider">
                  Fase
                </th>
                <th className="text-right px-5 py-3.5 font-bold text-[#6B6B65] text-xs uppercase tracking-wider">
                  Total km
                </th>
                <th className="text-right px-5 py-3.5 font-bold text-[#6B6B65] text-xs uppercase tracking-wider">
                  Antall sessions
                </th>
              </tr>
            </thead>
            <tbody>
              {WEEKS.map((w) => {
                const isCurrent = w.week === currentWeek;
                const sessionCount = w.sessions.filter(
                  (s) => s.type !== "Hvile" && s.type !== "Mobilitet"
                ).length;

                return (
                  <tr
                    key={w.week}
                    className={`border-b border-[#E5E5E2] last:border-b-0 transition-colors ${
                      isCurrent
                        ? "bg-[rgba(252,82,0,0.04)]"
                        : "hover:bg-[#FAFAF8]"
                    }`}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-bold tabular-nums ${
                            isCurrent ? "text-[#FC5200]" : "text-[#111110]"
                          }`}
                        >
                          {w.week}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] font-bold bg-[rgba(252,82,0,0.15)] text-[#FC5200] px-2 py-0.5 rounded-full">
                            Nå
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                          PHASE_COLORS[w.phase]
                        }`}
                      >
                        {w.phase}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span
                        className={`font-semibold tabular-nums ${
                          isCurrent ? "text-[#FC5200]" : "text-[#111110]"
                        }`}
                      >
                        {w.totalKm}
                      </span>
                      <span className="text-xs text-[#6B6B65] ml-1">km</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="font-semibold tabular-nums text-[#111110]">
                        {sessionCount}
                      </span>
                      <span className="text-xs text-[#6B6B65] ml-1">økter</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Summary row */}
        <div className="mt-4 flex items-center gap-6 text-sm text-[#6B6B65] px-1">
          <span>
            <span className="font-bold text-[#111110]">{WEEKS.length}</span> uker
          </span>
          <span>
            <span className="font-bold text-[#111110]">
              {WEEKS.reduce((sum, w) => sum + w.totalKm, 0)}
            </span>{" "}
            km totalt
          </span>
          <span>
            <span className="font-bold text-[#111110]">
              {WEEKS.reduce(
                (sum, w) =>
                  sum +
                  w.sessions.filter(
                    (s) => s.type !== "Hvile" && s.type !== "Mobilitet"
                  ).length,
                0
              )}
            </span>{" "}
            treningsøkter
          </span>
        </div>

        {/* Race day card */}
        <div className="mt-6 bg-gradient-to-br from-[rgba(252,82,0,0.12)] to-[rgba(252,82,0,0.04)] border border-[rgba(252,82,0,0.30)] rounded-2xl p-6 text-center">
          <div className="text-3xl mb-2">🏅</div>
          <h3 className="font-black text-lg tracking-tight">Bergen City Marathon — 24. april 2027</h3>
          <p className="text-sm text-[#6B6B65] mt-1">Mål: sub 2:00 halvmaraton &middot; {WEEKS.length} uker med trening</p>
        </div>
      </div>
    </div>
  );
}
