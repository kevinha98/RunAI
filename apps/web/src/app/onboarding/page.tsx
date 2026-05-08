"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowLeft, Brain, CheckCircle } from "lucide-react";

type Step = {
  id: string;
  title: string;
  subtitle: string;
};

const STEPS: Step[] = [
  { id: "goal", title: "Hva er m\u00e5let ditt?", subtitle: "Fortell oss hva du trener mot" },
  { id: "level", title: "L\u00f8psniv\u00e5?", subtitle: "V\u00e6r \u00e6rlig \u2014 dette former alt" },
  { id: "current", title: "Hvor er du n\u00e5?", subtitle: "Nylig ytelse hjelper kalibrere planen din" },
  { id: "schedule", title: "Hvor mange dager?", subtitle: "Vi tilpasser planen etter livet ditt" },
  { id: "timeline", title: "N\u00e5r er l\u00f8psdagen?", subtitle: "Velg en dato eller la AI velge optimal varighet" },
  { id: "generating", title: "Genererer planen din...", subtitle: "Claude bygger noe bare for deg" },
];

const GOALS = [
  { id: "5k", label: "5K", desc: "L\u00f8p eller forbedre 5K" },
  { id: "10k", label: "10K", desc: "Tren for et 10K-l\u00f8p" },
  { id: "half", label: "Halvmaraton", desc: "Mestre 21 kilometer" },
  { id: "marathon", label: "Maraton", desc: "G\u00e5 hele distansen" },
  { id: "ultra", label: "Ultra", desc: "Utover maraton" },
  { id: "custom", label: "Egendefinert", desc: "Hvilken som helst distanse" },
];

const LEVELS = [
  { id: "beginner", label: "Nybegynner", desc: "L\u00f8per mindre enn 6 m\u00e5neder, eller starter igjen" },
  { id: "intermediate", label: "Middels", desc: "L\u00f8per jevnlig i 1\u20132+ \u00e5r" },
  { id: "advanced", label: "Avansert", desc: "Konkurransedyktig, flere l\u00f8p bak seg" },
  { id: "elite", label: "Elite", desc: "Sub-elite eller klar for \u00e5 konkurrere i toppen" },
];

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

  return (
    <div className="min-h-dvh bg-[#F5F5F3] text-[#111110] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-[#E5E5E2]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-[#FC5200] rounded-lg flex items-center justify-center">
            <span className="text-white font-black text-xs">R</span>
          </div>
          <span className="font-bold">RunAI</span>
        </div>
        {step > 0 && step < STEPS.length - 1 && (
          <button
            onClick={back}
            className="flex items-center gap-1.5 text-sm text-[#6B6B65] hover:text-[#111110] transition-colors"
          >
            <ArrowLeft size={14} /> Tilbake
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-[#E5E5E2]">
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
            <p className="text-[#6B6B65]">{currentStep.subtitle}</p>
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
                      : "border-[#E5E5E2] bg-white hover:border-[rgba(252,82,0,0.30)]"
                  }`}
                >
                  <span className="font-bold text-lg mb-1">{g.label}</span>
                  <span className="text-xs text-[#6B6B65] mt-0.5">{g.desc}</span>
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
                      : "border-[#E5E5E2] bg-white hover:border-[rgba(252,82,0,0.30)]"
                  }`}
                >
                  <div>
                    <div className="font-bold">{l.label}</div>
                    <div className="text-xs text-[#6B6B65] mt-0.5">{l.desc}</div>
                  </div>
                  {data.level === l.id && (
                    <CheckCircle size={18} className="text-[#FC5200] shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Step: current fitness */}
          {currentStep.id === "current" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Nylig 5K-tid (valgfritt)
                </label>
                <input
                  type="text"
                  placeholder="f.eks. 25:30"
                  className="w-full bg-white border border-[#E5E5E2] rounded-xl px-4 py-3.5 text-[#111110] placeholder-[#A0A09A] focus:outline-none focus:border-[#FC5200] transition-colors"
                  onChange={(e) => setData((p) => ({ ...p, fiveKTime: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Ukentlig kilometergrense n\u00e5
                </label>
                <input
                  type="text"
                  placeholder="f.eks. 30 km/uke"
                  className="w-full bg-white border border-[#E5E5E2] rounded-xl px-4 py-3.5 text-[#111110] placeholder-[#A0A09A] focus:outline-none focus:border-[#FC5200] transition-colors"
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

          {/* Step: training days */}
          {currentStep.id === "schedule" && (
            <div className="space-y-3">
              {[
                { days: 3, label: "3 dager per uke", detail: "Minimal belastning" },
                { days: 4, label: "4 dager per uke", detail: "Balansert" },
                { days: 5, label: "5 dager per uke", detail: "Engasjert" },
                { days: 6, label: "6 dager per uke", detail: "H\u00f8y ytelse" },
              ].map(({ days, label, detail }) => (
                <button
                  key={days}
                  onClick={() => select("daysPerWeek", String(days))}
                  className={`w-full flex items-center justify-between p-5 rounded-2xl border transition-all ${
                    data.daysPerWeek === String(days)
                      ? "border-[#FC5200] bg-[rgba(252,82,0,0.10)]"
                      : "border-[#E5E5E2] bg-white hover:border-[rgba(252,82,0,0.30)]"
                  }`}
                >
                  <span className="font-bold">{label}</span>
                  <span className="text-sm text-[#6B6B65]">{detail}</span>
                </button>
              ))}
            </div>
          )}

          {/* Step: race date */}
          {currentStep.id === "timeline" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">
                  L\u00f8psdato (valgfritt)
                </label>
                <input
                  type="date"
                  className="w-full bg-white border border-[#E5E5E2] rounded-xl px-4 py-3.5 text-[#111110] focus:outline-none focus:border-[#FC5200] transition-colors [color-scheme:light]"
                  onChange={(e) => setData((p) => ({ ...p, raceDate: e.target.value }))}
                />
              </div>
              <p className="text-xs text-[#6B6B65] text-center">
                La st\u00e5 blank \u2014 da velger Claude optimal varighet
              </p>
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
            <GeneratingStep data={data} onComplete={() => router.push("/dashboard")} />
          )}
        </div>
      </div>
    </div>
  );
}

// --- GeneratingStep ---------------------------------------------------------
// Fixed: uses useEffect (not useState) so the interval cleanup works correctly
// Also calls /api/generate-plan and stores result in localStorage

function GeneratingStep({
  data,
  onComplete,
}: {
  data: Record<string, string>;
  onComplete: () => void;
}) {
  const [phase, setPhase] = useState(0);
  const phases = [
    "Analyserer din kondisjonsprofil...",
    "Beregner optimale treningssoner...",
    "Strukturerer ukentlig progresjon...",
    "Legger til styrke- og mobilitet\u00f8kter...",
    "Ferdigstiller din personlige plan...",
  ];

  useEffect(() => {
    let i = 0;

    // Fire-and-forget: generate the plan in the background
    fetch("/api/generate-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
      .then((res) => res.json())
      .then((result) => {
        if (result.plan) {
          try {
            localStorage.setItem("runai_plan", JSON.stringify(result.plan));
          } catch {
            // localStorage not available — continue anyway
          }
        }
      })
      .catch(() => {
        // Plan generation failed — user still goes to dashboard with mock plan
      });

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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
              i < phase ? "text-[#FC5200]" : i === phase ? "text-[#111110]" : "text-[#C8C8C4]"
            }`}
          >
            <span className="w-5 h-5 rounded-full border flex items-center justify-center text-xs shrink-0 border-current">
              {i < phase ? "\u2713" : i === phase ? "\u00b7" : ""}
            </span>
            {p}
          </div>
        ))}
      </div>
    </div>
  );
}
