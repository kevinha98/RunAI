"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useEffect } from "react";
import { ArrowRight, TrendingUp, Target, Activity, Brain, CheckCircle, AlertCircle, Clock } from "lucide-react";

// --- Mock preview data (shown as UI example, not real user data) -------------

const PREVIEW_WEEKS = [
  { week: "Uke 1", plan: 35, actual: 33 },
  { week: "Uke 2", plan: 38, actual: 40 },
  { week: "Uke 3", plan: 40, actual: 37 },
  { week: "Uke 4", plan: 32, actual: 31 },
  { week: "Uke 5", plan: 44, actual: 46 },
  { week: "Uke 6", plan: 48, actual: 43 },
  { week: "Uke 7", plan: 50, actual: 50 },
  { week: "Uke 8", plan: 52, actual: 0 },
];

const MAX_KM = 60;

const PREVIEW_METRICS = [
  {
    label: "Prognose halvmaraton",
    value: "1:58:32",
    sub: "Mål: sub 2:00",
    status: "ok" as const,
  },
  {
    label: "Ukevolum siste 4 uker",
    value: "42 km/uke",
    sub: "Plan: 43 km/uke",
    status: "ok" as const,
  },
  {
    label: "Gjennomsnittsintensitet",
    value: "5:41/km",
    sub: "Plan: 5:38/km",
    status: "ok" as const,
  },
  {
    label: "Manglende økter",
    value: "1 økt",
    sub: "Siste 4 uker",
    status: "warn" as const,
  },
];

const HOW_IT_WORKS = [
  {
    icon: Activity,
    step: "01",
    title: "Koble Strava",
    desc: "RunAI henter din faktiske treningshistorikk — distanse, fart, puls og alt annet. Ingen manuell registrering.",
  },
  {
    icon: Target,
    step: "02",
    title: "Sett målet ditt",
    desc: "Velg distanse og løpsdag. RunAI bygger en plan fra bunn basert på hva du faktisk kan gjøre, ikke hva du håper.",
  },
  {
    icon: Brain,
    step: "03",
    title: "Følg sporet",
    desc: "Dashbordet viser deg ukentlig om du er på sporet til målet. Planen justeres automatisk etter hva du faktisk gjennomfører.",
  },
];

const WHAT_IT_ANALYSES = [
  { label: "Ukentlig treningsvolum", desc: "km/uke faktisk vs plan" },
  { label: "Gjennomsnittsfart per økt", desc: "og sonefordeling" },
  { label: "Løpsprognose", desc: "estimert finishetid med konfidensintervall" },
  { label: "Kumulative kilometers", desc: "vs. progressiv plan-kurve" },
  { label: "Manglende og ekstra økter", desc: "og konsekvens for prognosen" },
  { label: "Restitusjons- og belastningsstatus", desc: "basert på treningshistorikk" },
];

function StatusBadge({ status }: { status: "ok" | "warn" | "bad" }) {
  if (status === "ok") {
    return (
      <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
        <CheckCircle size={11} /> På sporet
      </span>
    );
  }
  if (status === "warn") {
    return (
      <span className="flex items-center gap-1 text-xs font-semibold text-amber-400">
        <AlertCircle size={11} /> Følg med
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs font-semibold text-red-400">
      <AlertCircle size={11} /> Ute av sporet
    </span>
  );
}

// --- Animation helpers -------------------------------------------------------

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

function FadeUp({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "28%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.06]);

  // Supabase sometimes redirects the OAuth code to the Site URL (/) instead of
  // /auth/callback. Intercept and forward so login still works.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (code) {
      window.location.replace(`/auth/callback?code=${encodeURIComponent(code)}`);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F5F3] text-[#111110]">

      {/* ── Nav (transparent over hero, solid after) ─────────────────────────── */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-md border-b border-[#E5E5E2]"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#FC5200] rounded-lg flex items-center justify-center">
            <span className="text-white font-black text-sm tracking-tight">R</span>
          </div>
          <span className="font-bold text-lg tracking-tight">RunAI</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-sm text-[#6B6B65] hover:text-[#111110] transition-colors hidden sm:block">
            Dashboard
          </Link>
          <Link href="/onboarding" className="text-sm bg-[#FC5200] text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-[#E04800] transition-colors">
            Kom i gang
          </Link>
        </div>
      </motion.nav>

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section ref={heroRef} className="relative h-[92vh] min-h-[600px] overflow-hidden">
        {/* Parallax image */}
        <motion.div style={{ y: heroY, scale: heroScale }} className="absolute inset-0">
          <Image
            src="/hero.png"
            alt="Runner in motion"
            fill
            priority
            className="object-cover object-center"
          />
          {/* Gradient overlays — dark at bottom for text, subtle at top */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />
        </motion.div>

        {/* Hero content */}
        <motion.div
          style={{ opacity: heroOpacity }}
          className="relative z-10 h-full flex flex-col justify-end px-6 pb-16 max-w-5xl mx-auto"
        >
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="max-w-2xl"
          >
            <motion.p variants={fadeUp} className="text-xs font-bold uppercase tracking-widest text-[#FC5200] mb-4">
              AI-drevet løpeanalyse
            </motion.p>
            <motion.h1
              variants={fadeUp}
              className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tighter leading-[0.95] mb-6 text-white"
            >
              Er du på sporet<br />
              <span className="text-[#FC5200]">til målet ditt?</span>
            </motion.h1>
            <motion.p variants={fadeUp} className="text-white/75 text-lg max-w-lg leading-relaxed mb-8">
              RunAI analyserer treningsdataene dine og svarer på det spørsmålet hver uke — med konkrete tall, ikke magefølelse.
            </motion.p>
            <motion.div variants={fadeUp} className="flex items-center gap-4 flex-wrap">
              <Link
                href="/onboarding"
                className="inline-flex items-center gap-2.5 bg-[#FC5200] text-white px-8 py-4 rounded-xl font-bold text-base hover:bg-[#E04800] transition-all shadow-lg shadow-orange-600/30 hover:scale-[1.02] active:scale-[0.98]"
              >
                Kom i gang
                <ArrowRight size={16} />
              </Link>
              <Link href="/dashboard" className="inline-flex items-center gap-2 text-white/80 hover:text-white text-sm font-semibold transition-colors">
                Se dashboard →
              </Link>
            </motion.div>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.6 }}
            className="absolute bottom-8 right-6 flex flex-col items-center gap-1.5"
          >
            <span className="text-[10px] text-white/50 uppercase tracking-widest font-semibold">Scroll</span>
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
              className="w-px h-8 bg-gradient-to-b from-white/50 to-transparent"
            />
          </motion.div>
        </motion.div>
      </section>

      {/* ── Stats strip ───────────────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="bg-[#FC5200] text-white py-5 px-6"
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between flex-wrap gap-4">
          {[
            { value: "Bergen City", label: "Maraton 24. april 2027" },
            { value: "3×/uke", label: "Anbefalt volum" },
            { value: "Sub 4:00", label: "Eksempelmål" },
            { value: "AI-drevet", label: "Personlig plan" },
          ].map((s) => (
            <div key={s.label} className="text-center flex-1 min-w-[80px]">
              <div className="text-xl font-black tracking-tight">{s.value}</div>
              <div className="text-xs text-white/70 font-medium mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </motion.section>

      {/* ── Dashboard preview ────────────────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <FadeUp className="mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-[#FC5200] mb-3">Live eksempel</p>
            <h2 className="text-3xl font-black tracking-tight">Din ukentlige analyse</h2>
          </FadeUp>

          <FadeUp delay={0.1}>
            <div className="bg-white border border-[#E5E5E2] rounded-2xl overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E5E5E2]">
                <div className="flex items-center gap-2">
                  <TrendingUp size={13} className="text-[#FC5200]" />
                  <span className="text-xs font-bold text-[#6B6B65] uppercase tracking-widest">Ukerapport — uke 8 av 12</span>
                </div>
                <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                  <CheckCircle size={11} className="text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-400">På sporet</span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[#E5E5E2]">
                {PREVIEW_METRICS.map((m) => (
                  <div key={m.label} className="bg-white p-5">
                    <div className="text-xs text-[#6B6B65] mb-1.5 font-medium">{m.label}</div>
                    <div className="text-xl font-black tracking-tight mb-0.5">{m.value}</div>
                    <div className="text-xs text-[#6B6B65] mb-2">{m.sub}</div>
                    <StatusBadge status={m.status} />
                  </div>
                ))}
              </div>

              <div className="p-5 border-t border-[#E5E5E2]">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-[#6B6B65] uppercase tracking-widest">Ukevolum (km) — plan vs faktisk</span>
                  <div className="flex items-center gap-4 text-xs text-[#6B6B65]">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#E5E5E2] inline-block" />Plan</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#FC5200] inline-block" />Faktisk</span>
                  </div>
                </div>
                <div className="flex items-end gap-1.5 h-28">
                  {PREVIEW_WEEKS.map((w) => {
                    const planH = Math.round((w.plan / MAX_KM) * 100);
                    const actualH = w.actual > 0 ? Math.round((w.actual / MAX_KM) * 100) : 0;
                    const isCurrent = w.actual === 0;
                    return (
                      <div key={w.week} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full flex items-end gap-0.5 h-24">
                          <div className="flex-1 rounded-sm bg-[#E5E5E2]" style={{ height: `${planH}%` }} />
                          <div className={`flex-1 rounded-sm ${isCurrent ? "bg-[#FC5200]/20 border border-dashed border-[#FC5200]/30" : "bg-[#FC5200]"}`} style={{ height: isCurrent ? `${planH}%` : `${actualH}%` }} />
                        </div>
                        <span className="text-[10px] text-[#6B6B65]">{w.week.replace("Uke ", "U")}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="px-5 py-4 border-t border-[#E5E5E2] bg-[rgba(252,82,0,0.04)] flex items-start gap-3">
                <Brain size={14} className="text-[#FC5200] mt-0.5 shrink-0" />
                <p className="text-xs text-[#6B6B65] leading-relaxed">
                  <span className="text-[#111110] font-semibold">AI-analyse:</span>{" "}
                  Progresjonskurven er stabil. Uke 5 viste 2 km mer enn planlagt — dette er kompensert.
                  Basert på gjennomsnittsfart siste 3 uker er prognosen{" "}
                  <span className="text-emerald-400 font-semibold">1:58:32</span>, noe som holder sub 2:00-målet.
                </p>
              </div>
            </div>
            <p className="text-xs text-[#6B6B65] text-center mt-3">Eksempeldata — ditt eget dashboard vises etter oppsett</p>
          </FadeUp>
        </div>
      </section>

      {/* ── What it analyses ─────────────────────────────────────────────────── */}
      <section className="py-16 px-6 border-t border-[#E5E5E2]">
        <div className="max-w-5xl mx-auto">
          <FadeUp className="mb-8">
            <h2 className="text-2xl font-black tracking-tight mb-1">Hva RunAI analyserer</h2>
            <p className="text-[#6B6B65] text-sm">Hentet direkte fra Strava — ingen manuell registrering.</p>
          </FadeUp>
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-40px" }}
            className="grid sm:grid-cols-2 md:grid-cols-3 gap-3"
          >
            {WHAT_IT_ANALYSES.map((item) => (
              <motion.div key={item.label} variants={fadeUp} className="flex items-start gap-3 bg-white border border-[#E5E5E2] rounded-xl p-4 hover:border-[#FC5200]/40 hover:shadow-sm transition-all">
                <div className="w-1.5 h-1.5 rounded-full bg-[#FC5200] mt-1.5 shrink-0" />
                <div>
                  <div className="text-sm font-semibold">{item.label}</div>
                  <div className="text-xs text-[#6B6B65] mt-0.5">{item.desc}</div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────────── */}
      <section className="py-16 px-6 border-t border-[#E5E5E2]">
        <div className="max-w-5xl mx-auto">
          <FadeUp className="mb-8">
            <h2 className="text-2xl font-black tracking-tight">Hvordan det fungerer</h2>
          </FadeUp>
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-40px" }}
            className="grid md:grid-cols-3 gap-5"
          >
            {HOW_IT_WORKS.map((step) => {
              const Icon = step.icon;
              return (
                <motion.div key={step.step} variants={fadeUp} className="bg-white border border-[#E5E5E2] rounded-2xl p-6 hover:shadow-md hover:border-[#FC5200]/30 transition-all">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-xs font-black text-[#6B6B65] tabular-nums">{step.step}</span>
                    <div className="w-9 h-9 bg-[#FC5200]/10 rounded-xl flex items-center justify-center">
                      <Icon size={17} className="text-[#FC5200]" />
                    </div>
                  </div>
                  <h3 className="font-bold text-base mb-2 tracking-tight">{step.title}</h3>
                  <p className="text-[#6B6B65] text-sm leading-relaxed">{step.desc}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ── RunAI er / er ikke ───────────────────────────────────────────────── */}
      <section className="py-16 px-6 border-t border-[#E5E5E2] bg-white">
        <div className="max-w-5xl mx-auto">
          <FadeUp className="mb-6">
            <h2 className="text-xl font-black tracking-tight">Hva RunAI er — og ikke er</h2>
          </FadeUp>
          <div className="grid md:grid-cols-2 gap-4">
            <FadeUp delay={0.1}>
              <div className="bg-white border border-[#E5E5E2] rounded-xl p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-3">RunAI er</p>
                <ul className="space-y-2.5 text-sm text-[#6B6B65]">
                  {["Et analyseverktøy som forteller deg om du er på sporet", "En AI-coach som genererer plan basert på dine faktiske data", "En ukentlig rapport med konkrete tall, ikke magefølelse", "Et verktøy som justerer planen når du avviker fra den"].map((t) => (
                    <li key={t} className="flex items-start gap-2">
                      <CheckCircle size={13} className="text-emerald-400 mt-0.5 shrink-0" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </FadeUp>
            <FadeUp delay={0.2}>
              <div className="bg-white border border-[#E5E5E2] rounded-xl p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-[#6B6B65] mb-3">RunAI er ikke</p>
                <ul className="space-y-2.5 text-sm text-[#6B6B65]">
                  {["En erstatning for en fysioterapeut eller lege", "Et kurs med ferdiglagde maler", "En app med garanterte resultater", "Ferdig utviklet — under aktiv utvikling"].map((t) => (
                    <li key={t} className="flex items-start gap-2">
                      <span className="shrink-0 font-bold leading-5">—</span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 border-t border-[#E5E5E2] relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#FC5200]/6 rounded-full blur-[100px]" />
        </div>
        <FadeUp className="max-w-xl mx-auto text-center relative">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Clock size={13} className="text-[#6B6B65]" />
            <span className="text-xs text-[#6B6B65]">Oppsett tar under 5 minutter</span>
          </div>
          <h2 className="text-4xl font-black tracking-tight mb-3">Se om du er på sporet</h2>
          <p className="text-[#6B6B65] text-sm mb-8">Koble Strava, sett måldato, og RunAI bygger analysen din.</p>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-2.5 bg-[#FC5200] text-white px-10 py-4 rounded-xl font-bold text-base hover:bg-[#E04800] transition-colors shadow-lg shadow-orange-600/25"
            >
              Kom i gang
              <ArrowRight size={16} />
            </Link>
          </motion.div>
        </FadeUp>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="border-t border-[#E5E5E2] py-6 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#FC5200] rounded-md flex items-center justify-center">
              <span className="text-white font-black text-[10px]">R</span>
            </div>
            <span className="text-sm text-[#6B6B65]">RunAI — under utvikling</span>
          </div>
          <Link href="/dashboard" className="text-xs text-[#6B6B65] hover:text-[#111110] transition-colors">
            Dashboard
          </Link>
        </div>
      </footer>
    </div>
  );
}