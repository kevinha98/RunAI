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
  { id: "goal", title: "What's your goal?", subtitle: "Tell us what you're training for" },
  { id: "level", title: "Your running level?", subtitle: "Be honest — this shapes everything" },
  { id: "current", title: "Where are you now?", subtitle: "Recent performance helps calibrate your plan" },
  { id: "schedule", title: "How many days?", subtitle: "We'll fit your plan around your life" },
  { id: "timeline", title: "When's race day?", subtitle: "Pick a date or let AI choose optimal duration" },
  { id: "generating", title: "Generating your plan...", subtitle: "Claude is building something just for you" },
];

const GOALS = [
  { id: "5k", label: "5K", emoji: "🏃", desc: "Run or improve your 5K" },
  { id: "10k", label: "10K", emoji: "🔥", desc: "Train for a 10K race" },
  { id: "half", label: "Half Marathon", emoji: "⚡", desc: "Conquer the half" },
  { id: "marathon", label: "Marathon", emoji: "🏆", desc: "Go the full distance" },
  { id: "ultra", label: "Ultra", emoji: "🌄", desc: "Beyond the marathon" },
  { id: "custom", label: "Custom", emoji: "🎯", desc: "Any distance or goal" },
];

const LEVELS = [
  { id: "beginner", label: "Beginner", desc: "Running less than 6 months, or starting again" },
  { id: "intermediate", label: "Intermediate", desc: "Running regularly for 1–2+ years" },
  { id: "advanced", label: "Advanced", desc: "Competitive, multiple races under your belt" },
  { id: "elite", label: "Elite", desc: "Sub-elite or open to racing at the sharp end" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<Record<string, string>>({});

  const currentStep = STEPS[step];
  const progress = ((step) / (STEPS.length - 1)) * 100;

  function select(key: string, value: string) {
    setData((prev) => ({ ...prev, [key]: value }));
    if (step < STEPS.length - 1) {
      setTimeout(() => setStep((s) => s + 1), 200);
    }
  }

  function back() {
    if (step > 0) setStep((s) => s - 1);
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-[#1f1f1f]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#22c55e] rounded-lg flex items-center justify-center">
            <span className="text-black font-bold text-xs">R</span>
          </div>
          <span className="font-semibold">RunAI</span>
        </div>
        {step > 0 && step < STEPS.length - 1 && (
          <button onClick={back} className="flex items-center gap-1 text-sm text-[#71717a] hover:text-white transition-colors">
            <ArrowLeft size={14} /> Back
          </button>
        )}
      </div>

      {/* Progress */}
      <div className="h-0.5 bg-[#1f1f1f]">
        <div
          className="h-full bg-[#22c55e] transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold mb-2">{currentStep.title}</h1>
            <p className="text-[#71717a]">{currentStep.subtitle}</p>
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
                      ? "border-[#22c55e] bg-[#22c55e]/10"
                      : "border-[#1f1f1f] bg-[#141414] hover:border-[#22c55e]/40"
                  }`}
                >
                  <span className="text-2xl mb-2">{g.emoji}</span>
                  <span className="font-semibold">{g.label}</span>
                  <span className="text-xs text-[#71717a] mt-1">{g.desc}</span>
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
                      ? "border-[#22c55e] bg-[#22c55e]/10"
                      : "border-[#1f1f1f] bg-[#141414] hover:border-[#22c55e]/40"
                  }`}
                >
                  <div>
                    <div className="font-semibold">{l.label}</div>
                    <div className="text-xs text-[#71717a] mt-0.5">{l.desc}</div>
                  </div>
                  {data.level === l.id && <div className="w-5 h-5 rounded-full bg-[#22c55e] flex items-center justify-center"><span className="text-black text-xs">✓</span></div>}
                </button>
              ))}
            </div>
          )}

          {/* Step: current */}
          {currentStep.id === "current" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Recent 5K time (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 25:30"
                  className="w-full bg-[#141414] border border-[#1f1f1f] rounded-xl px-4 py-3 text-white placeholder-[#52525b] focus:outline-none focus:border-[#22c55e] transition-colors"
                  onChange={(e) => setData((p) => ({ ...p, fiveKTime: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Weekly mileage right now</label>
                <input
                  type="text"
                  placeholder="e.g. 30 km/week"
                  className="w-full bg-[#141414] border border-[#1f1f1f] rounded-xl px-4 py-3 text-white placeholder-[#52525b] focus:outline-none focus:border-[#22c55e] transition-colors"
                  onChange={(e) => setData((p) => ({ ...p, weeklyKm: e.target.value }))}
                />
              </div>
              <button
                onClick={() => setStep((s) => s + 1)}
                className="w-full flex items-center justify-center gap-2 bg-[#22c55e] text-black py-4 rounded-xl font-semibold hover:bg-[#16a34a] transition-colors mt-2"
              >
                Continue <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* Step: schedule */}
          {currentStep.id === "schedule" && (
            <div className="space-y-3">
              {[3, 4, 5, 6].map((days) => (
                <button
                  key={days}
                  onClick={() => select("daysPerWeek", String(days))}
                  className={`w-full flex items-center justify-between p-5 rounded-2xl border transition-all ${
                    data.daysPerWeek === String(days)
                      ? "border-[#22c55e] bg-[#22c55e]/10"
                      : "border-[#1f1f1f] bg-[#141414] hover:border-[#22c55e]/40"
                  }`}
                >
                  <span className="font-semibold">{days} days per week</span>
                  <span className="text-sm text-[#71717a]">
                    {days === 3 ? "Minimal" : days === 4 ? "Balanced" : days === 5 ? "Committed" : "High performance"}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Step: timeline */}
          {currentStep.id === "timeline" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Race date (optional)</label>
                <input
                  type="date"
                  className="w-full bg-[#141414] border border-[#1f1f1f] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#22c55e] transition-colors [color-scheme:dark]"
                  onChange={(e) => setData((p) => ({ ...p, raceDate: e.target.value }))}
                />
              </div>
              <p className="text-xs text-[#52525b] text-center">Leave blank and Claude will pick an optimal duration</p>
              <button
                onClick={() => setStep((s) => s + 1)}
                className="w-full flex items-center justify-center gap-2 bg-[#22c55e] text-black py-4 rounded-xl font-semibold hover:bg-[#16a34a] transition-colors"
              >
                Generate my plan <Brain size={16} />
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
    "Analyzing your fitness profile...",
    "Calculating optimal training zones...",
    "Structuring your weekly progressions...",
    "Adding strength & mobility sessions...",
    "Finalizing your personalized plan...",
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
      {/* Animated logo */}
      <div className="flex items-center justify-center">
        <div className="w-20 h-20 bg-[#22c55e]/10 rounded-3xl flex items-center justify-center animate-pulse">
          <Brain size={40} className="text-[#22c55e]" />
        </div>
      </div>

      {/* Phases */}
      <div className="space-y-3">
        {phases.map((p, i) => (
          <div
            key={p}
            className={`flex items-center gap-3 text-sm transition-all duration-500 ${
              i < phase ? "text-[#22c55e]" : i === phase ? "text-white" : "text-[#3f3f46]"
            }`}
          >
            <span className="w-5 h-5 rounded-full border flex items-center justify-center text-xs flex-shrink-0 border-current">
              {i < phase ? "✓" : i === phase ? "•" : ""}
            </span>
            {p}
          </div>
        ))}
      </div>
    </div>
  );
}
