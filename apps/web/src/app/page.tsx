import Link from "next/link";
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

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0D0D0C] text-[#F2F2F0]">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 border-b border-[#2E2E29] bg-[#0D0D0C]/90 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#FC5200] rounded-lg flex items-center justify-center">
            <span className="text-white font-black text-sm tracking-tight">R</span>
          </div>
          <span className="font-bold text-lg tracking-tight">RunAI</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-sm text-[#9A9A92] hover:text-[#F2F2F0] transition-colors hidden sm:block"
          >
            Dashboard
          </Link>
          <Link
            href="/onboarding"
            className="text-sm bg-[#FC5200] text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-[#E04800] transition-colors"
          >
            Kom i gang
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-16 px-6">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-[#FC5200]/5 rounded-full blur-[120px]" />
        </div>

        <div className="relative max-w-5xl mx-auto">
          <div className="mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-[#FC5200] mb-3">AI-drevet løpeanalyse</p>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter leading-[1.0] mb-5">
              Er du på sporet<br />
              <span className="text-[#FC5200]">til løpsmålet ditt?</span>
            </h1>
            <p className="text-[#9A9A92] text-lg max-w-xl leading-relaxed">
              RunAI analyserer treningsdataene dine og svarer på det spørsmålet hver uke — med konkrete tall, ikke magefølelse.
            </p>
          </div>

          {/* Dashboard preview */}
          <div className="bg-[#111110] border border-[#2E2E29] rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#2E2E29]">
              <div className="flex items-center gap-2">
                <TrendingUp size={13} className="text-[#FC5200]" />
                <span className="text-xs font-bold text-[#9A9A92] uppercase tracking-widest">Ukerapport — uke 8 av 12</span>
              </div>
              <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                <CheckCircle size={11} className="text-emerald-400" />
                <span className="text-xs font-bold text-emerald-400">På sporet</span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[#2E2E29]">
              {PREVIEW_METRICS.map((m) => (
                <div key={m.label} className="bg-[#111110] p-5">
                  <div className="text-xs text-[#5A5A54] mb-1.5 font-medium">{m.label}</div>
                  <div className="text-xl font-black tracking-tight mb-0.5">{m.value}</div>
                  <div className="text-xs text-[#5A5A54] mb-2">{m.sub}</div>
                  <StatusBadge status={m.status} />
                </div>
              ))}
            </div>

            <div className="p-5 border-t border-[#2E2E29]">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-[#9A9A92] uppercase tracking-widest">Ukevolum (km) — plan vs faktisk</span>
                <div className="flex items-center gap-4 text-xs text-[#5A5A54]">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#2E2E29] inline-block" />Plan
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FC5200] inline-block" />Faktisk
                  </span>
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
                        <div className="flex-1 rounded-sm bg-[#2E2E29]" style={{ height: `${planH}%` }} />
                        <div
                          className={`flex-1 rounded-sm ${isCurrent ? "bg-[#FC5200]/20 border border-dashed border-[#FC5200]/30" : "bg-[#FC5200]"}`}
                          style={{ height: isCurrent ? `${planH}%` : `${actualH}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-[#5A5A54]">{w.week.replace("Uke ", "U")}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="px-5 py-4 border-t border-[#2E2E29] bg-[rgba(252,82,0,0.04)] flex items-start gap-3">
              <Brain size={14} className="text-[#FC5200] mt-0.5 shrink-0" />
              <p className="text-xs text-[#9A9A92] leading-relaxed">
                <span className="text-[#F2F2F0] font-semibold">AI-analyse:</span>{" "}
                Progresjonskurven er stabil. Uke 5 viste 2 km mer enn planlagt — dette er kompensert.
                Basert på gjennomsnittsfart siste 3 uker er prognosen{" "}
                <span className="text-emerald-400 font-semibold">1:58:32</span>, noe som holder sub 2:00-målet.
              </p>
            </div>
          </div>

          <p className="text-xs text-[#5A5A54] text-center mt-3">Eksempeldata — ditt eget dashboard vises etter oppsett</p>
        </div>
      </section>

      {/* What it analyses */}
      <section className="py-14 px-6 border-t border-[#2E2E29]">
        <div className="max-w-5xl mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-black tracking-tight mb-1">Hva RunAI analyserer</h2>
            <p className="text-[#9A9A92] text-sm">Hentet direkte fra Strava — ingen manuell registrering.</p>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {WHAT_IT_ANALYSES.map((item) => (
              <div key={item.label} className="flex items-start gap-3 bg-[#1A1A17] border border-[#2E2E29] rounded-xl p-4">
                <div className="w-1.5 h-1.5 rounded-full bg-[#FC5200] mt-1.5 shrink-0" />
                <div>
                  <div className="text-sm font-semibold">{item.label}</div>
                  <div className="text-xs text-[#5A5A54] mt-0.5">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-14 px-6 border-t border-[#2E2E29]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-black tracking-tight mb-8">Hvordan det fungerer</h2>
          <div className="grid md:grid-cols-3 gap-5">
            {HOW_IT_WORKS.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.step} className="bg-[#1A1A17] border border-[#2E2E29] rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-xs font-black text-[#5A5A54] tabular-nums">{step.step}</span>
                    <div className="w-9 h-9 bg-[#FC5200]/10 rounded-xl flex items-center justify-center">
                      <Icon size={17} className="text-[#FC5200]" />
                    </div>
                  </div>
                  <h3 className="font-bold text-base mb-2 tracking-tight">{step.title}</h3>
                  <p className="text-[#9A9A92] text-sm leading-relaxed">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Honest about what it is/isn't */}
      <section className="py-14 px-6 border-t border-[#2E2E29] bg-[#111110]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl font-black tracking-tight mb-6">Hva RunAI er — og ikke er</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-[#1A1A17] border border-[#2E2E29] rounded-xl p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-3">RunAI er</p>
              <ul className="space-y-2.5 text-sm text-[#9A9A92]">
                <li className="flex items-start gap-2">
                  <CheckCircle size={13} className="text-emerald-400 mt-0.5 shrink-0" />
                  Et analyseverktøy som forteller deg om du er på sporet
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle size={13} className="text-emerald-400 mt-0.5 shrink-0" />
                  En AI-coach som genererer plan basert på dine faktiske data
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle size={13} className="text-emerald-400 mt-0.5 shrink-0" />
                  En ukentlig rapport med konkrete tall, ikke magefølelse
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle size={13} className="text-emerald-400 mt-0.5 shrink-0" />
                  Et verktøy som justerer planen når du avviker fra den
                </li>
              </ul>
            </div>
            <div className="bg-[#1A1A17] border border-[#2E2E29] rounded-xl p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-[#5A5A54] mb-3">RunAI er ikke</p>
              <ul className="space-y-2.5 text-sm text-[#9A9A92]">
                <li className="flex items-start gap-2">
                  <span className="text-[#5A5A54] shrink-0 font-bold leading-5">—</span>
                  En erstatning for en fysioterapeut eller lege
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#5A5A54] shrink-0 font-bold leading-5">—</span>
                  Et kurs med ferdiglagde maler
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#5A5A54] shrink-0 font-bold leading-5">—</span>
                  En app med garanterte resultater
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#5A5A54] shrink-0 font-bold leading-5">—</span>
                  Ferdig utviklet — under aktiv utvikling
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 border-t border-[#2E2E29]">
        <div className="max-w-xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Clock size={13} className="text-[#5A5A54]" />
            <span className="text-xs text-[#5A5A54]">Oppsett tar under 5 minutter</span>
          </div>
          <h2 className="text-3xl font-black tracking-tight mb-3">Se om du er på sporet</h2>
          <p className="text-[#9A9A92] text-sm mb-8">Koble Strava, sett måldato, og RunAI bygger analysen din.</p>
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-2.5 bg-[#FC5200] text-white px-8 py-4 rounded-xl font-bold text-base hover:bg-[#E04800] transition-all"
          >
            Kom i gang
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#2E2E29] py-6 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#FC5200] rounded-md flex items-center justify-center">
              <span className="text-white font-black text-[10px]">R</span>
            </div>
            <span className="text-sm text-[#5A5A54]">RunAI — under utvikling</span>
          </div>
          <Link href="/dashboard" className="text-xs text-[#5A5A54] hover:text-[#9A9A92] transition-colors">
            Dashboard
          </Link>
        </div>
      </footer>
    </div>
  );
}
