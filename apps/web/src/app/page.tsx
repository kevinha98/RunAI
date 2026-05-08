import Link from "next/link";
import { ArrowRight, Brain, Zap, TrendingUp, Watch, MessageCircle, Repeat } from "lucide-react";

const FEATURES = [
  {
    icon: Brain,
    title: "Claude-Powered Plans",
    description:
      "Not templates. Claude generates a genuinely unique training plan from your fitness history, goals, sleep, and recovery — then rewrites it every week based on how you actually performed.",
  },
  {
    icon: Repeat,
    title: "Truly Adaptive",
    description:
      "Crushed a tempo run? Your next week gets harder. Missed two sessions? The plan quietly restructures without you asking. Real adaptation, not static week-by-week progressions.",
  },
  {
    icon: MessageCircle,
    title: "Your AI Coach, 24/7",
    description:
      'Ask "Why am I doing this threshold run?" or "I feel tired — should I do this workout?" Your coach knows your full training history and gives you a real answer.',
  },
  {
    icon: Watch,
    title: "Syncs Everything",
    description:
      "Apple Health, Google Health Connect, Garmin, Strava — all your data flows in automatically. Your coach sees what you actually did, not what you planned.",
  },
  {
    icon: TrendingUp,
    title: "Race Prediction Engine",
    description:
      "Based on your real training data, RunAI predicts your finish time with confidence intervals — and shows you exactly what to change to hit your goal.",
  },
  {
    icon: Zap,
    title: "Strength & Mobility",
    description:
      "AI-generated complementary strength and mobility sessions that slot around your running without over-loading you — runner-specific, not generic gym plans.",
  },
];

const TESTIMONIALS = [
  {
    quote:
      "I've tried Runna, Garmin Coach, Nike Run Club. RunAI is the first one that felt like it was actually watching what I was doing and responding.",
    name: "Markus T.",
    detail: "3:42 marathon → 3:21 in 16 weeks",
  },
  {
    quote:
      "I asked my coach why my easy runs felt so hard and it explained my aerobic base deficit and adjusted the plan on the spot. Mind blown.",
    name: "Sofie L.",
    detail: "First half marathon finisher",
  },
  {
    quote:
      "Missed a week with a cold. Instead of falling behind I asked the app and it rebuilt the last 6 weeks of my marathon block around the gap. Ran a PR.",
    name: "James K.",
    detail: "2:58 marathon PB",
  },
];

const PLANS = [
  { distance: "5K", emoji: "🏃", weeks: "6–12 weeks" },
  { distance: "10K", emoji: "🔥", weeks: "8–16 weeks" },
  { distance: "Half Marathon", emoji: "⚡", weeks: "10–20 weeks" },
  { distance: "Marathon", emoji: "🏆", weeks: "16–24 weeks" },
  { distance: "Ultra", emoji: "🌄", weeks: "20–36 weeks" },
  { distance: "Custom", emoji: "🎯", weeks: "Any distance, any date" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 border-b border-[#1f1f1f] bg-[#0a0a0a]/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#22c55e] rounded-lg flex items-center justify-center">
            <span className="text-black font-bold text-sm">R</span>
          </div>
          <span className="font-semibold text-lg tracking-tight">RunAI</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm text-[#a1a1aa]">
          <Link href="#features" className="hover:text-white transition-colors">Features</Link>
          <Link href="#plans" className="hover:text-white transition-colors">Plans</Link>
          <Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm text-[#a1a1aa] hover:text-white transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/onboarding"
            className="text-sm bg-[#22c55e] text-black px-4 py-2 rounded-lg font-medium hover:bg-[#16a34a] transition-colors"
          >
            Start free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-24 px-6 text-center overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[#22c55e]/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#22c55e] text-xs font-medium px-3 py-1.5 rounded-full mb-6">
            <Brain size={12} />
            Powered by Claude AI
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
            Your running coach
            <br />
            <span className="text-[#22c55e]">actually thinks.</span>
          </h1>
          <p className="text-xl text-[#a1a1aa] max-w-2xl mx-auto leading-relaxed mb-10">
            RunAI generates a genuinely unique training plan for you — and rewrites it
            every week based on how you actually run. Not templates. Real AI.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/onboarding"
              className="flex items-center gap-2 bg-[#22c55e] text-black px-8 py-4 rounded-xl font-semibold text-lg hover:bg-[#16a34a] transition-colors"
            >
              Get your free plan
              <ArrowRight size={18} />
            </Link>
            <Link
              href="#features"
              className="flex items-center gap-2 text-[#a1a1aa] hover:text-white transition-colors px-8 py-4"
            >
              See how it works
            </Link>
          </div>
          <p className="text-xs text-[#52525b] mt-4">First week free · No credit card required · Cancel anytime</p>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-[#1f1f1f] py-8 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-8 text-center">
          {[
            { value: "4.9★", label: "App Store rating" },
            { value: "Weekly", label: "Plan regeneration" },
            { value: "∞", label: "Coach conversations" },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-3xl font-bold text-[#22c55e]">{stat.value}</div>
              <div className="text-sm text-[#71717a] mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Not a template. A real coach.</h2>
            <p className="text-[#71717a] text-lg max-w-2xl mx-auto">
              Every other app gives you the same plan as everyone else. RunAI starts from scratch — for you.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="bg-[#141414] border border-[#1f1f1f] rounded-2xl p-6 hover:border-[#22c55e]/30 transition-colors group"
                >
                  <div className="w-10 h-10 bg-[#22c55e]/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-[#22c55e]/20 transition-colors">
                    <Icon size={20} className="text-[#22c55e]" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-[#71717a] text-sm leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Plans */}
      <section id="plans" className="py-24 px-6 bg-[#0d0d0d]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Every distance. Every level.</h2>
            <p className="text-[#71717a]">Tell RunAI your goal. It figures out the rest.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {PLANS.map((plan) => (
              <Link
                key={plan.distance}
                href="/onboarding"
                className="bg-[#141414] border border-[#1f1f1f] rounded-2xl p-6 hover:border-[#22c55e]/40 hover:bg-[#141414] transition-all group"
              >
                <div className="text-3xl mb-3">{plan.emoji}</div>
                <div className="font-semibold text-lg group-hover:text-[#22c55e] transition-colors">{plan.distance}</div>
                <div className="text-xs text-[#52525b] mt-1">{plan.weeks}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">Real results.</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-[#141414] border border-[#1f1f1f] rounded-2xl p-6">
                <div className="text-[#22c55e] text-xl mb-3">★★★★★</div>
                <p className="text-[#d4d4d8] text-sm leading-relaxed mb-4">"{t.quote}"</p>
                <div>
                  <div className="font-medium text-sm">{t.name}</div>
                  <div className="text-xs text-[#22c55e]">{t.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6 bg-[#0d0d0d]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">Simple pricing.</h2>
          <p className="text-[#71717a] mb-12">One plan. Everything included. Cancel anytime.</p>
          <div className="bg-[#141414] border border-[#22c55e]/30 rounded-3xl p-10 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#22c55e] text-black text-xs font-bold px-4 py-1.5 rounded-full">
              MOST POPULAR
            </div>
            <div className="text-5xl font-bold mb-2">
              kr 149<span className="text-xl font-normal text-[#71717a]">/month</span>
            </div>
            <div className="text-[#71717a] mb-2">or kr 999/year (save 44%)</div>
            <div className="text-sm text-[#22c55e] mb-8">First week completely free</div>
            <ul className="text-left space-y-3 mb-8 max-w-sm mx-auto">
              {[
                "AI-generated training plans, weekly",
                "Unlimited coach conversations",
                "HealthKit & Health Connect sync",
                "Strava & Garmin integration",
                "Strength & mobility sessions",
                "Race prediction & pacing",
                "Injury prevention guidance",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm">
                  <span className="text-[#22c55e] font-bold">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/onboarding"
              className="block w-full bg-[#22c55e] text-black py-4 rounded-xl font-semibold text-lg hover:bg-[#16a34a] transition-colors"
            >
              Start your free week
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl font-bold mb-4">Start running smarter today.</h2>
          <p className="text-[#71717a] mb-8">
            Generate your first AI training plan in under 2 minutes.
          </p>
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-2 bg-[#22c55e] text-black px-8 py-4 rounded-xl font-semibold text-lg hover:bg-[#16a34a] transition-colors"
          >
            Get started free <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1f1f1f] py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#22c55e] rounded flex items-center justify-center">
              <span className="text-black font-bold text-xs">R</span>
            </div>
            <span className="font-medium">RunAI</span>
          </div>
          <div className="text-xs text-[#52525b]">© 2026 RunAI. All rights reserved.</div>
          <div className="flex gap-6 text-xs text-[#71717a]">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
