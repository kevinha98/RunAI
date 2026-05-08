import DashboardSidebar from "../DashboardSidebar";
import { readStats } from "@/lib/stats-store";
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
    focus: "Stabilitet og holdning for l\u00f8ping",
    exercises: [
      { name: "Glute bridge", sets: "3", reps: "15", note: "Press hoften rett opp, hold 2 sek" },
      { name: "Dead bug", sets: "3", reps: "10/side", note: "Korsryggen mot gulvet hele veien" },
      { name: "Planke", sets: "3", reps: "45 sek", note: "Rett linje fra hode til h\u00e6l" },
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
      { name: "Enbens knieb\u00f8y", sets: "3", reps: "10/side", note: "Kne over t\u00e5, kontrollert ned" },
      { name: "Nordic hamstring curl", sets: "3", reps: "8", note: "Ekstremt effektivt mot hamstring-skader" },
      { name: "Hip thrust", sets: "3", reps: "15", note: "Vektbelastet gir best effekt" },
      { name: "Lateral band walk", sets: "3", reps: "15/side", note: "Aktiverer gluteus medius" },
      { name: "Calf raise", sets: "3", reps: "20", note: "H\u00e6ver f\u00f8tter og styrker \u00e5re" },
    ],
  },
  {
    title: "Dynamisk mobilitet",
    duration: "10 min",
    icon: "\ud83e\uddd8",
    focus: "Bevegelighet og skadeforebygging",
    exercises: [
      { name: "Leggsveis (leg swing)", sets: "2", reps: "15/side", note: "Frem og tilbake, s\u00e5 side til side" },
      { name: "Hip flexor tøying", sets: "2", reps: "45 sek/side", note: "Kne mot gulvet, foroverlent hofte" },
      { name: "Skritt\u00e5pner (lunge med rotasjon)", sets: "2", reps: "8/side", note: "Roter mot forb\u00e6ret" },
      { name: "Ankel-sirkler", sets: "2", reps: "10/side", note: "Roer ankelmobilitet for l\u00f8ping" },
      { name: "Pigeon stretch", sets: "2", reps: "60 sek/side", note: "Dyp hofteb\u00f8yer-tøying" },
    ],
  },
  {
    title: "L\u00f8pesp\u00e8sifikke \u00f8velser",
    duration: "12 min",
    icon: "\u26a1",
    focus: "Nevromuskulær effektivitet og teknikk",
    exercises: [
      { name: "A-skip", sets: "3", reps: "20 m", note: "Kn\u00e6r opp, armarbeid rytmisk" },
      { name: "B-skip", sets: "3", reps: "20 m", note: "Kne opp + strekk i luften" },
      { name: "Ankeldrive", sets: "3", reps: "20 m", note: "Rask, lav kontakt med bakken" },
      { name: "Strider (bakke-fart)", sets: "4", reps: "80 m", note: "85\u201390% av maks, avslappet form" },
      { name: "Stridende hoppserie", sets: "3", reps: "10", note: "Fjærende avgang, soft landing" },
    ],
  },
];

const WEEKLY_PLAN = [
  { day: "Mandag", session: "Kjerneaktivering", after: "Etter morgenl\u00f8pet" },
  { day: "Tirsdag", session: "Bein og hofte", after: "Etter terskel\u00f8kten (lett dag)" },
  { day: "Onsdag", session: "\u2014 Hvile fra styrke", after: "Fokus p\u00e5 l\u00f8ping" },
  { day: "Torsdag", session: "Dynamisk mobilitet", after: "Som oppvarming" },
  { day: "Fredag", session: "L\u00f8pespesifikke \u00f8velser", after: "F\u00f8r lett l\u00f8p" },
  { day: "L\u00f8rdag", session: "\u2014 Hvile fra styrke", after: "Langkj\u00f8ringsdag" },
  { day: "S\u00f8ndag", session: "\u2014 Hvile", after: "Full restitusjon" },
];

export default async function StrengthPage() {
  const stats = await Promise.resolve(readStats());

  return (
    <div className="min-h-screen bg-[#0D0D0C] text-[#F2F2F0] flex">
      <DashboardSidebar stats={stats} activePath="/dashboard/strength" />

      <div className="flex-1 ml-60 p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2.5">
            <Zap size={22} className="text-[#FC5200]" />
            Styrketrening
          </h1>
          <p className="text-[#9A9A92] text-sm mt-1">
            L\u00f8psspesifikke styrke\u00f8kter for bedre ytelse og skadeforebygging
          </p>
        </div>

        {/* Weekly plan strip */}
        <div className="bg-[#111110] border border-[#2E2E29] rounded-2xl p-5 mb-8">
          <h3 className="font-bold text-sm mb-4">Ukentlig styrkeplan</h3>
          <div className="grid grid-cols-7 gap-1">
            {WEEKLY_PLAN.map((d) => (
              <div key={d.day} className="text-center">
                <div className="text-[10px] font-bold text-[#5A5A54] mb-1.5">
                  {d.day.slice(0, 3)}
                </div>
                <div
                  className={`text-[10px] leading-tight rounded-lg p-1.5 ${
                    d.session.startsWith("\u2014")
                      ? "text-[#3A3A35] bg-transparent"
                      : "text-[#FC5200] bg-[rgba(252,82,0,0.08)] font-semibold"
                  }`}
                >
                  {d.session.startsWith("\u2014") ? "Hvile" : d.session.split(" ")[0]}
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
              className="bg-[#1A1A17] border border-[#2E2E29] rounded-2xl overflow-hidden"
            >
              {/* Session header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#2E2E29]">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{session.icon}</span>
                  <div>
                    <div className="font-bold text-sm">{session.title}</div>
                    <div className="text-xs text-[#9A9A92]">{session.focus}</div>
                  </div>
                </div>
                <span className="text-xs text-[#5A5A54] bg-[#222220] px-2.5 py-1 rounded-lg font-semibold">
                  {session.duration}
                </span>
              </div>

              {/* Exercise list */}
              <div className="divide-y divide-[#2E2E29]">
                {session.exercises.map((ex) => (
                  <div key={ex.name} className="px-5 py-3.5 flex items-start gap-4">
                    <div className="flex-1">
                      <div className="text-sm font-semibold">{ex.name}</div>
                      <div className="text-xs text-[#5A5A54] mt-0.5">{ex.note}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-[#FC5200]">{ex.sets} sett</div>
                      <div className="text-xs text-[#9A9A92]">{ex.reps}</div>
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
              icon: "\u23f0",
              title: "N\u00e5r?",
              desc: "Gj\u00f8r styrke etter l\u00f8ping, aldri f\u00f8r lengre \u00f8kter. Unng\u00e5 tung styrke dagen f\u00f8r terskel\u00f8kt.",
            },
            {
              icon: "\ud83d\udcc8",
              title: "Progresjon",
              desc: "Start lett, bygg opp over 4\u20136 uker. 2 styrke\u00f8kter per uke er optimal for l\u00f8pere.",
            },
            {
              icon: "\ud83d\udca4",
              title: "Restitusjon",
              desc: "Styrketrening bryter ned muskel. Restitusjon og s\u00f8vn er der du faktisk blir sterkere.",
            },
          ].map((tip) => (
            <div key={tip.title} className="bg-[#111110] border border-[#2E2E29] rounded-xl p-4">
              <div className="text-xl mb-2">{tip.icon}</div>
              <div className="text-sm font-bold mb-1">{tip.title}</div>
              <div className="text-xs text-[#9A9A92] leading-relaxed">{tip.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
