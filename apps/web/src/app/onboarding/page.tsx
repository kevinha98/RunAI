"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowLeft, Brain } from "lucide-react";

type Step = {
  id: string;
  title: string;
  subtitle: string;
};

const STEPS: Step[] = [
  { id: "goal", title: "Hva er målet ditt?", subtitle: "Fortell oss hva du trener mot" },
  { id: "level", title: "Løpsnivå?", subtitle: "Vær ærlig — dette former alt" },
  { id: "current", title: "Hvor er du nå?", subtitle: "Nylig ytelse hjelper kalibrere planen din" },
  { id: "schedule", title: "Hvor mange dager?", subtitle: "Vi tilpasser planen etter livet ditt" },
  { id: "timeline", title: "Når er løpsdagen?", subtitle: "Velg en dato eller la AI velge optimal varighet" },
  { id: "generating", title: "Genererer planen din...", subtitle: "Claude bygger noe bare for deg" },
];

const GOALS = [
  { id: "5k", label: "5K", desc: "Løp eller forbedre 5K" },
  { id: "10k", label: "10K", desc: "Tren for et 10K-løp" },
  { id: "half", label: "Halvmaraton", desc: "Mestre 21 kilometer" },
  { id: "marathon", label: "Maraton", desc: "Gå hele distansen" },
  { id: "ultra", label: "Ultra", desc: "Utover maraton" },
  { id: "custom", label: "Egendefinert", desc: "Hvilken som helst distanse" },
];

const LEVELS = [
  { id: "beginner", label: "Nybegynner", desc: "Løper mindre enn 6 måneder, eller starter igjen" },
  { id: "intermediate", label: "Middels", desc: "Løper jevnlig i 1–2+ år" },
  { id: "advanced", label: "Avansert", desc: "Konkurransedyktig, flere løp bak seg" },
  { id: "elite", label: "Elite", desc: "Sub-elite eller klar for å konkurrere i toppen" },
];

const P = "#FC5200";
const PBG = "rgba(252,82,0,0.10)";
const PBORDER = "rgba(252,82,0,0.35)";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<Record<string, string>>({});

  const currentStep = STEPS[step];
  const progress = (step / (STEPS.length - 1)) * 100;

  function select(key: string, value: string) {
    setData((prev) => ({ ...prev, [key]: value }));
    if (step < STEPS.length - 1) {
      setTimeout(() => setStep((s) => s + 1), 180);
    }
  }

  function back() {
    if (step > 0) setStep((s) => s - 1);
  }

  const btnActive = `border-[${P}] bg-[${PBG}]`;
  const btnIdle = "border-[#2E2E29] bg-[#1A1A17] hover:border-[rgba(252,82,0,0.30)]";

  return (
    <div className="min-h-dvh bg-[#0D0D0C] text-[#F2F2F0] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-[#2E2E29]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-[#FC5200] rounded-lg flex items-center justify-center">
            <span className="text-white font-black text-xs">R</span>
          </div>
          <span className="font-bold">RunAI</span>
        </div>
        {step > 0 && step < STEPS.length - 1 && (
          <button onClick={back} className="flex items-center gap-1.5 text-sm text-[#9A9A92] hover:text-[#F2F2F0] transition-colors">
            <ArrowLeft size={14} /> Tilbake
          </button>
        )}
      </div>

      {/* Progress */}
      <div className="h-0.5 bg-[#2E2E29]">
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${progress}%`, background: "#FC5200" }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-black tracking-tight mb-2">{currentStep.title}</h1>
            <p className="text-[#9A9A92]">{currentStep.subtitle}</p>
          </div>

          {/* Step: goal */}
          {currentStep.id === "goal" && (
            <div className="grid grid-cols-2 gap-3">
              {GOALS.map((g) => (
                <button
                  key={g.id}
                  onClick={() => select("goal", g.id)}
                  className={`flex flex-col items-start p-5 rounded-2xl border transition-all text-left ${
                    data.goal === g.id
                      ? "border-[#FC5200] bg-[rgba(252,82,0,0.10)]"
                      : "border-[#2E2E29] bg-[#1A1A17] hover:border-[rgba(252,82,0,0.30)]"
                  }`}
                >
                  <span className="font-bold text-lg mb-1">{g.label}</span>
                  <span className="text-xs text-[#9A9A92] mt-0.5">{g.desc}</span>
                </button>
              ))}
            </div>
          )}

          {/* Step: level */}
          {currentStep.id === "level" && (
            <div className="space-y-3">
              {LEVELS.map((l) => (
                <button
                  key={l.id}
                  onClick={() => select("level", l.id)}
                  className={`w-full flex items-center justify-between p-5 rounded-2xl border transition-all text-left ${
                    data.level === l.id
                      ? "border-[#FC5200] bg-[rgba(252,82,0,0.10)]"
                      : "border-[#2E2E29] bg-[#1A1A17] hover:border-[rgba(252,82,0,0.30)]"
                  }`}
                >
                  <div>
                    <div className="font-bold">{l.label}</div>
                    <div className="text-xs text-[#9A9A92] mt-0.5">{l.desc}</div>
                  </div>
                  {data.level === l.id && (
                    <div className="w-5 h-5 rounded-full bg-[#FC5200] flex items-center justify-center shrink-0">
                      <span className="text-white text-xs font-bold">âœ“</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Step: current */}
          {currentStep.id === "current" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Nylig 5K-tid (valgfritt)</label>
                <input
                  type="text"
                  placeholder="f.eks. 25:30"
                  className="w-full bg-[#1A1A17] border border-[#2E2E29] rounded-xl px-4 py-3.5 text-[#F2F2F0] placeholder-[#5A5A54] focus:outline-none focus:border-[#FC5200] transition-colors"
                  onChange={(e) => setData((p) => ({ ...p, fiveKTime: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Ukentlig kilometergrense nå</label>
                <input
                  type="text"
                  placeholder="f.eks. 30 km/uke"
                  className="w-full bg-[#1A1A17] border border-[#2E2E29] rounded-xl px-4 py-3.5 text-[#F2F2F0] placeholder-[#5A5A54] focus:outline-none focus:border-[#FC5200] transition-colors"
                  onChange={(e) => setData((p) => ({ ...p, weeklyKm: e.target.value }))}
                />
              </div>
              <button
                onClick={() => setStep((s) => s + 1)}
                className="w-full flex items-center justify-center gap-2 bg-[#FC5200] text-white py-4 rounded-xl font-bold hover:bg-[#E04800] transition-colors mt-2"
              >
                Fortsett <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* Step: schedule */}
          {currentStep.id === "schedule" && (
            <div className="space-y-3">
              {[
                { days: 3, label: "3 dager per uke", detail: "Minimal belastning" },
                { days: 4, label: "4 dager per uke", detail: "Balansert" },
                { days: 5, label: "5 dager per uke", detail: "Engasjert" },
                { days: 6, label: "6 dager per uke", detail: "Høy ytelse" },
              ].map(({ days, label, detail }) => (
                <button
                  key={days}
                  onClick={() => select("daysPerWeek", String(days))}
                  className={`w-full flex items-center justify-between p-5 rounded-2xl border transition-all ${
                    data.daysPerWeek === String(days)
                      ? "border-[#FC5200] bg-[rgba(252,82,0,0.10)]"
                      : "border-[#2E2E29] bg-[#1A1A17] hover:border-[rgba(252,82,0,0.30)]"
                  }`}
                >
                  <span className="font-bold">{label}</span>
                  <span className="text-sm text-[#9A9A92]">{detail}</span>
                </button>
              ))}
            </div>
          )}

          {/* Step: timeline */}
          {currentStep.id === "timeline" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Løpsdato (valgfritt)</label>
                <input
                  type="date"
                  className="w-full bg-[#1A1A17] border border-[#2E2E29] rounded-xl px-4 py-3.5 text-[#F2F2F0] focus:outline-none focus:border-[#FC5200] transition-colors [color-scheme:dark]"
                  onChange={(e) => setData((p) => ({ ...p, raceDate: e.target.value }))}
                />
              </div>
              <p className="text-xs text-[#5A5A54] text-center">La stå blank — da velger Claude optimal varighet</p>
              <button
                onClick={() => setStep((s) => s + 1)}
                className="w-full flex items-center justify-center gap-2 bg-[#FC5200] text-white py-4 rounded-xl font-bold hover:bg-[#E04800] transition-colors"
              >
                Generer planen min <Brain size={16} />
              </button>
            </div>
          )}

          {/* Step: generating */}
          {currentStep.id === "generating" && (
            <GeneratingStep onComplete={() => router.push("/dashboard")} />
          )}
        </div>
      </div>
    </div>
  );
}

function GeneratingStep({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState(0);
  const phases = [
    "Analyserer din kondisjonsprofil...",
    "Beregner optimale treningssoner...",
    "Strukturerer ukentlig progresjon...",
    "Legger til styrke- og mobilitetsøkter...",
    "Ferdigstiller din personlige plan...",
  ];

  useState(() => {
    let i = 0;
    const interval = setInterval(() => {
      i++;
      if (i < phases.length) {
        setPhase(i);
      } else {
        clearInterval(interval);
        setTimeout(onComplete, 800);
      }
    }, 900);
    return () => clearInterval(interval);
  });

  return (
    <div className="text-center space-y-8">
      <div className="flex items-center justify-center">
        <div className="w-20 h-20 bg-[rgba(252,82,0,0.10)] rounded-3xl flex items-center justify-center animate-pulse">
          <Brain size={40} className="text-[#FC5200]" />
        </div>
      </div>
      <div className="space-y-3 text-left">
        {phases.map((p, i) => (
          <div
            key={p}
            className={`flex items-center gap-3 text-sm transition-all duration-500 ${
              i < phase ? "text-[#FC5200]" : i === phase ? "text-[#F2F2F0]" : "text-[#3A3A35]"
            }`}
          >
            <span className="w-5 h-5 rounded-full border flex items-center justify-center text-xs shrink-0 border-current">
              {i < phase ? "âœ“" : i === phase ? "·" : ""}
            </span>
            {p}
          </div>
        ))}
      </div>
    </div>
  );
}
