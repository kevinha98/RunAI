import DashboardSidebar from "../DashboardSidebar";

import { readUserStats } from "@/lib/stats-store";

import { createClient } from "@/lib/supabase/server";

import { redirect } from "next/navigation";

import { Calendar, CheckCircle, Clock, Zap, Activity, Heart } from "lucide-react";

import Link from "next/link";

import { PLAN_START, WEEKS, getCurrentWeek, SESSION_ICONS } from "@/lib/plan-data";

import type { Phase } from "@/lib/plan-data";



export const metadata = { title: "Treningsplan" };

const NO_MONTHS = ["jan", "feb", "mar", "apr", "mai", "jun", "jul", "aug", "sep", "okt", "nov", "des"];

function weekDates(weekNum: number): string {
  const start = new Date(PLAN_START);
  start.setDate(start.getDate() + (weekNum - 1) * 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const startStr = `${start.getDate()}. ${NO_MONTHS[start.getMonth()]}`;
  const endStr = `${end.getDate()}. ${NO_MONTHS[end.getMonth()]}`;
  const yearSuffix = end.getFullYear() !== 2026 ? ` ${end.getFullYear()}` : "";
  return `${startStr} – ${endStr}${yearSuffix}`;
}



// --- Training plan data imported from @/lib/plan-data -----------------------

const CURRENT_WEEK = getCurrentWeek();

const PHASE_COLORS: Record<Phase, string> = {

  Grunntrening: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",

  Bygging: "text-blue-400 bg-blue-500/10 border-blue-500/20",

  Topp: "text-[#FC5200] bg-[rgba(252,82,0,0.10)] border-[rgba(252,82,0,0.25)]",

  Nedtrapping: "text-amber-400 bg-amber-500/10 border-amber-500/20",

};



export default async function PlanPage() {

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const stats = await readUserStats(user.id);



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

              Fase 1 av 3 &middot; Bergen City Marathon 24. april 2027

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

                    ? "border-[rgba(252,82,0,0.30)] bg-white"

                    : "border-[#E5E5E2] bg-white"

                }`}

              >

                {/* Week header */}

                <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E5E2]">

                  <div className="flex items-center gap-3">

                    {isPast ? (

                      <CheckCircle size={15} className="text-emerald-400" />

                    ) : (

                      <span

                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${

                          isCurrent ? "border-[#FC5200] text-[#FC5200]" : "border-[#D0D0CC] text-[#6B6B65]"

                        }`}

                      >

                        {w.week}

                      </span>

                    )}

                    <div>

                      <div className="font-bold text-sm flex items-center gap-2">

                        Uke {w.week}

                        {isCurrent && (

                          <span className="text-xs bg-[rgba(252,82,0,0.15)] text-[#FC5200] px-2 py-0.5 rounded-full font-bold">

                            Nå

                          </span>

                        )}

                      </div>

                      <div className="text-xs text-[#6B6B65] mt-0.5">{weekDates(w.week)}</div>

                    </div>

                  </div>

                  <div className="flex items-center gap-3">

                    <span

                      className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${PHASE_COLORS[w.phase]}`}

                    >

                      {w.phase}

                    </span>

                    <span className="text-sm text-[#6B6B65] font-semibold">{w.totalKm} km</span>

                  </div>

                </div>



                {/* Sessions — only show for current week expanded, others collapsed */}

                {(isCurrent || isPast) && (

                  <div className="grid grid-cols-7 divide-x divide-[#E5E5E2]">

                    {w.sessions.map((s) => (

                      <div key={s.day} className="p-3 text-center">

                        <div className="text-[10px] font-bold text-[#6B6B65] mb-1">{s.day}</div>

                        <div className="text-lg mb-1">{s.icon}</div>

                        <div

                          className={`text-[10px] font-semibold leading-tight ${

                            s.type === "Hvile" ? "text-[#C8C8C4]" : "text-[#111110]"

                          }`}

                        >

                          {s.type}

                        </div>

                        <div className="text-[10px] text-[#6B6B65] mt-0.5">{s.distance}</div>

                      </div>

                    ))}

                  </div>

                )}



                {/* Future weeks — compact summary */}

                {!isCurrent && !isPast && (

                  <div className="px-5 py-3 flex items-center gap-2 text-xs text-[#6B6B65]">

                    <Clock size={11} />

                    {w.sessions.filter((s) => s.type !== "Hvile" && s.type !== "Mobilitet").length} treningsøkter

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

          <h3 className="font-black text-lg tracking-tight">Bergen City Marathon — 24. april 2027</h3>

          <p className="text-sm text-[#6B6B65] mt-1">Mål: sub 2:00 halvmaraton &middot; Fase 1 av 3 pågår nå</p>

        </div>

      </div>

    </div>

  );

}

