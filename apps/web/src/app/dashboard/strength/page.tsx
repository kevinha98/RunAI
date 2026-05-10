import DashboardSidebar from "../DashboardSidebar";

import { readUserStats } from "@/lib/stats-store";

import { createClient } from "@/lib/supabase/server";

import { redirect } from "next/navigation";

import { Zap } from "lucide-react";



export const metadata = { title: "Styrke" };



// --- Runner-specific strength sessions --------------------------------------



interface Exercise {

  name: string;

  sets: string;

  reps: string;

  note: string;

}



interface Session {

  title: string;

  duration: string;

  icon: string;

  focus: string;

  exercises: Exercise[];

}



const SESSIONS: Session[] = [

  {

    title: "Kjerneaktivering",

    duration: "15 min",

    icon: "\ud83c\udfaf",

    focus: "Stabilitet og holdning for løping",

    exercises: [

      { name: "Glute bridge", sets: "3", reps: "15", note: "Press hoften rett opp, hold 2 sek" },

      { name: "Dead bug", sets: "3", reps: "10/side", note: "Korsryggen mot gulvet hele veien" },

      { name: "Planke", sets: "3", reps: "45 sek", note: "Rett linje fra hode til hæl" },

      { name: "Sideplanke", sets: "2", reps: "30 sek/side", note: "Hofte oppe, ikke synke" },

      { name: "Bird dog", sets: "3", reps: "8/side", note: "Langsom og kontrollert bevegelse" },

    ],

  },

  {

    title: "Bein og hofte",

    duration: "20 min",

    icon: "\ud83d\udc9a",

    focus: "Kraft for fraspark og stigningsarbeid",

    exercises: [

      { name: "Enbens kniebøy", sets: "3", reps: "10/side", note: "Kne over tå, kontrollert ned" },

      { name: "Nordic hamstring curl", sets: "3", reps: "8", note: "Ekstremt effektivt mot hamstring-skader" },

      { name: "Hip thrust", sets: "3", reps: "15", note: "Vektbelastet gir best effekt" },

      { name: "Lateral band walk", sets: "3", reps: "15/side", note: "Aktiverer gluteus medius" },

      { name: "Calf raise", sets: "3", reps: "20", note: "Hæver føtter og styrker åre" },

    ],

  },

  {

    title: "Dynamisk mobilitet",

    duration: "10 min",

    icon: "\ud83e\uddd8",

    focus: "Bevegelighet og skadeforebygging",

    exercises: [

      { name: "Leggsveis (leg swing)", sets: "2", reps: "15/side", note: "Frem og tilbake, så side til side" },

      { name: "Hip flexor tøying", sets: "2", reps: "45 sek/side", note: "Kne mot gulvet, foroverlent hofte" },

      { name: "Skrittåpner (lunge med rotasjon)", sets: "2", reps: "8/side", note: "Roter mot forbæret" },

      { name: "Ankel-sirkler", sets: "2", reps: "10/side", note: "Roer ankelmobilitet for løping" },

      { name: "Pigeon stretch", sets: "2", reps: "60 sek/side", note: "Dyp hoftebøyer-tøying" },

    ],

  },

  {

    title: "Løpespèsifikke øvelser",

    duration: "12 min",

    icon: "⚡",

    focus: "Nevromuskulær effektivitet og teknikk",

    exercises: [

      { name: "A-skip", sets: "3", reps: "20 m", note: "Knær opp, armarbeid rytmisk" },

      { name: "B-skip", sets: "3", reps: "20 m", note: "Kne opp + strekk i luften" },

      { name: "Ankeldrive", sets: "3", reps: "20 m", note: "Rask, lav kontakt med bakken" },

      { name: "Strider (bakke-fart)", sets: "4", reps: "80 m", note: "85–90% av maks, avslappet form" },

      { name: "Stridende hoppserie", sets: "3", reps: "10", note: "Fjærende avgang, soft landing" },

    ],

  },

];



const WEEKLY_PLAN = [

  { day: "Mandag", session: "Kjerneaktivering", after: "Etter morgenløpet" },

  { day: "Tirsdag", session: "Bein og hofte", after: "Etter terskeløkten (lett dag)" },

  { day: "Onsdag", session: "— Hvile fra styrke", after: "Fokus på løping" },

  { day: "Torsdag", session: "Dynamisk mobilitet", after: "Som oppvarming" },

  { day: "Fredag", session: "Løpespesifikke øvelser", after: "Før lett løp" },

  { day: "Lørdag", session: "— Hvile fra styrke", after: "Langkjøringsdag" },

  { day: "Søndag", session: "— Hvile", after: "Full restitusjon" },

];



export default async function StrengthPage() {

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const stats = await readUserStats(user?.id ?? "");



  return (

    <div className="min-h-screen bg-[#F5F5F3] text-[#111110] flex">

      <DashboardSidebar stats={stats} activePath="/dashboard/strength" />



      <div className="flex-1 md:ml-60 p-4 md:p-8">

        {/* Header */}

        <div className="mb-8">

          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2.5">

            <Zap size={22} className="text-[#FC5200]" />

            Styrketrening

          </h1>

          <p className="text-[#6B6B65] text-sm mt-1">

            Løpsspesifikke styrkeøkter for bedre ytelse og skadeforebygging

          </p>

        </div>



        {/* Weekly plan strip */}

        <div className="bg-white border border-[#E5E5E2] rounded-2xl p-5 mb-8">

          <h3 className="font-bold text-sm mb-4">Ukentlig styrkeplan</h3>

          <div className="grid grid-cols-7 gap-1">

            {WEEKLY_PLAN.map((d) => (

              <div key={d.day} className="text-center">

                <div className="text-[10px] font-bold text-[#6B6B65] mb-1.5">

                  {d.day.slice(0, 3)}

                </div>

                <div

                  className={`text-[10px] leading-tight rounded-lg p-1.5 ${

                    d.session.startsWith("—")

                      ? "text-[#C8C8C4] bg-transparent"

                      : "text-[#FC5200] bg-[rgba(252,82,0,0.08)] font-semibold"

                  }`}

                >

                  {d.session.startsWith("—") ? "Hvile" : d.session.split(" ")[0]}

                </div>

              </div>

            ))}

          </div>

        </div>



        {/* Sessions grid */}

        <div className="grid md:grid-cols-2 gap-6">

          {SESSIONS.map((session) => (

            <div

              key={session.title}

              className="bg-white border border-[#E5E5E2] rounded-2xl overflow-hidden"

            >

              {/* Session header */}

              <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E5E2]">

                <div className="flex items-center gap-3">

                  <span className="text-xl">{session.icon}</span>

                  <div>

                    <div className="font-bold text-sm">{session.title}</div>

                    <div className="text-xs text-[#6B6B65]">{session.focus}</div>

                  </div>

                </div>

                <span className="text-xs text-[#6B6B65] bg-[#F2F2F0] px-2.5 py-1 rounded-lg font-semibold">

                  {session.duration}

                </span>

              </div>



              {/* Exercise list */}

              <div className="divide-y divide-[#E5E5E2]">

                {session.exercises.map((ex) => (

                  <div key={ex.name} className="px-5 py-3.5 flex items-start gap-4">

                    <div className="flex-1">

                      <div className="text-sm font-semibold">{ex.name}</div>

                      <div className="text-xs text-[#6B6B65] mt-0.5">{ex.note}</div>

                    </div>

                    <div className="text-right shrink-0">

                      <div className="text-xs font-bold text-[#FC5200]">{ex.sets} sett</div>

                      <div className="text-xs text-[#6B6B65]">{ex.reps}</div>

                    </div>

                  </div>

                ))}

              </div>

            </div>

          ))}

        </div>



        {/* Tips */}

        <div className="mt-8 grid md:grid-cols-3 gap-4">

          {[

            {

              icon: "⏰",

              title: "Når?",

              desc: "Gjør styrke etter løping, aldri før lengre økter. Unngå tung styrke dagen før terskeløkt.",

            },

            {

              icon: "\ud83d\udcc8",

              title: "Progresjon",

              desc: "Start lett, bygg opp over 4–6 uker. 2 styrkeøkter per uke er optimal for løpere.",

            },

            {

              icon: "\ud83d\udca4",

              title: "Restitusjon",

              desc: "Styrketrening bryter ned muskel. Restitusjon og søvn er der du faktisk blir sterkere.",

            },

          ].map((tip) => (

            <div key={tip.title} className="bg-white border border-[#E5E5E2] rounded-xl p-4">

              <div className="text-xl mb-2">{tip.icon}</div>

              <div className="text-sm font-bold mb-1">{tip.title}</div>

              <div className="text-xs text-[#6B6B65] leading-relaxed">{tip.desc}</div>

            </div>

          ))}

        </div>

      </div>

    </div>

  );

}

