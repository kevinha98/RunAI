import Link from "next/link";
import { ArrowRight, Brain, Zap, TrendingUp, Watch, MessageCircle, Repeat, ChevronRight } from "lucide-react";

const FEATURES = [
  {
    icon: Brain,
    title: "Claude-drevne planer",
    description:
      "Ingen maler. Claude lager et ekte, unikt treningsprogram fra bunn â€” basert pÃ¥ din lÃ¸pshistorikk, mÃ¥l, sÃ¸vn og hvile. Og omskriver det ukentlig.",
  },
  {
    icon: Repeat,
    title: "Ekte tilpasning",
    description:
      "Knuste du en terskelÃ¸kt? Neste uke blir tÃ¸ffere. Gikk du glipp av to Ã¸kter? Programmet restrukturerer seg stille â€” uten at du trenger Ã¥ spÃ¸rre.",
  },
  {
    icon: MessageCircle,
    title: "Din AI-trener, 24/7",
    description:
      "SpÃ¸r Â«Hvorfor gjÃ¸r jeg denne intervallÃ¸kten?Â» eller Â«Jeg er sliten â€” bÃ¸r jeg hoppe over?Â» Coachen din kjenner din fulle treningshistorikk og gir deg et ekte svar.",
  },
  {
    icon: Watch,
    title: "Synkroniserer alt",
    description:
      "Apple Health, Google Health Connect, Garmin, Strava â€” all data flyter inn automatisk. Coachen din ser hva du faktisk gjorde, ikke hva du planla.",
  },
  {
    icon: TrendingUp,
    title: "LÃ¸psprediksjon",
    description:
      "Basert pÃ¥ din reelle treningsdata forutsier RunAI finishen din med konfidensintervaller â€” og viser deg nÃ¸yaktig hva du mÃ¥ endre for Ã¥ nÃ¥ mÃ¥let.",
  },
  {
    icon: Zap,
    title: "Styrke og bevegelighet",
    description:
      "AI-genererte styrke- og mobilitetsÃ¸kter som passer rundt lÃ¸pingen din uten Ã¥ overbelaste. LÃ¸perspesifikk, ikke generiske treningsstudioplaner.",
  },
];

const TESTIMONIALS = [
  {
    quote:
      "Jeg har prÃ¸vd Runna, Garmin Coach og Nike Run Club. RunAI er den fÃ¸rste som faktisk fÃ¸ltes som den fulgte med pÃ¥ hva jeg gjorde og responderte.",
    name: "Markus T.",
    detail: "3:42 maraton â†’ 3:21 pÃ¥ 16 uker",
  },
  {
    quote:
      "Spurte coachen min hvorfor lette lÃ¸p fÃ¸ltes sÃ¥ tunge. Den forklarte aerob baseunderskudd og justerte planen pÃ¥ stedet. Imponerende.",
    name: "Sofie L.",
    detail: "FÃ¸rste halvmaratonfinisher",
  },
  {
    quote:
      "Gikk glipp av en uke med forkjÃ¸lelse. I stedet for Ã¥ falle bak, bygde appen de siste 6 ukene av maratonblokken rundt hullet. LÃ¸p PR.",
    name: "James K.",
    detail: "2:58 maraton-PB",
  },
];

const PLANS = [
  { distance: "5K", weeks: "6â€“12 uker", desc: "Perfekt start" },
  { distance: "10K", weeks: "8â€“16 uker", desc: "Neste steg" },
  { distance: "Halvmaraton", weeks: "10â€“20 uker", desc: "Mestre 21K" },
  { distance: "Maraton", weeks: "16â€“24 uker", desc: "Hele distansen" },
  { distance: "Ultra", weeks: "20â€“36 uker", desc: "Utover maraton" },
  { distance: "Egendefinert", weeks: "Hvilken som helst dato", desc: "Ditt mÃ¥l, dine vilkÃ¥r" },
];

const PRICING = [
  {
    name: "Gratis",
    price: "0",
    period: "",
    desc: "Kom i gang",
    features: ["1 treningsplan", "Grunnleggende ukeplaner", "AI-coach (10 spÃ¸rsmÃ¥l/uke)", "Strava-synkronisering"],
    cta: "Start gratis",
    href: "/onboarding",
    highlight: false,
  },
  {
    name: "Pro",
    price: "99",
    period: "kr/mnd",
    desc: "For den seriÃ¸se lÃ¸peren",
    features: ["Ubegrensede planer", "Ukentlig plan-regenerering", "Ubegrenset AI-coach", "Alle integrasjoner", "LÃ¸psprediksjon", "StyrkeÃ¸kter"],
    cta: "Start Pro",
    href: "/onboarding",
    highlight: true,
  },
  {
    name: "Elite",
    price: "249",
    period: "kr/mnd",
    desc: "Toppytelse",
    features: ["Alt i Pro", "Prioritert AI-respons", "Avansert ytelsesanalyse", "Egendefinerte makrosykluser", "Eksport til Garmin/Polar", "Dedikert stÃ¸tte"],
    cta: "Start Elite",
    href: "/onboarding",
    highlight: false,
  },
];

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
        <div className="hidden md:flex items-center gap-8 text-sm text-[#9A9A92]">
          <Link href="#funksjoner" className="hover:text-[#F2F2F0] transition-colors">Funksjoner</Link>
          <Link href="#planer" className="hover:text-[#F2F2F0] transition-colors">Planer</Link>
          <Link href="#priser" className="hover:text-[#F2F2F0] transition-colors">Priser</Link>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm text-[#9A9A92] hover:text-[#F2F2F0] transition-colors hidden sm:block"
          >
            Logg inn
          </Link>
          <Link
            href="/onboarding"
            className="text-sm bg-[#FC5200] text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-[#E04800] transition-colors"
          >
            Start gratis
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-36 pb-28 px-6 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-[#FC5200]/6 rounded-full blur-[120px]" />
          <div className="absolute top-1/2 left-1/4 w-[400px] h-[400px] bg-[#FC5200]/4 rounded-full blur-[80px]" />
        </div>

        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-[#FC5200]/12 border border-[#FC5200]/25 text-[#FC5200] text-xs font-semibold px-4 py-2 rounded-full mb-8 tracking-wide uppercase">
            <Brain size={11} />
            Drevet av Claude AI
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-8xl font-black tracking-tighter leading-[0.95] mb-8">
            Din lÃ¸pecoach
            <br />
            <span className="text-[#FC5200]">tenker faktisk.</span>
          </h1>

          <p className="text-lg sm:text-xl text-[#9A9A92] max-w-2xl mx-auto leading-relaxed mb-12">
            RunAI lager et personlig treningsprogram basert pÃ¥ din historikk og mÃ¥l â€”
            og omskriver det hver uke ut fra hvordan du faktisk lÃ¸per.
            Ikke maler. Ekte AI.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <Link
              href="/onboarding"
              className="flex items-center gap-2.5 bg-[#FC5200] text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-[#E04800] transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              FÃ¥ din gratis plan
              <ArrowRight size={18} />
            </Link>
            <Link
              href="#funksjoner"
              className="flex items-center gap-2 text-[#9A9A92] hover:text-[#F2F2F0] transition-colors px-6 py-4 group"
            >
              Se hvordan det fungerer
              <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <p className="text-xs text-[#5A5A54]">FÃ¸rste uke gratis Â· Inget kredittkort Â· Avslutt nÃ¥r du vil</p>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-[#2E2E29] py-10 px-6">
        <div className="max-w-3xl mx-auto grid grid-cols-3 gap-8 text-center">
          {[
            { value: "4.9â˜…", label: "App Store-vurdering" },
            { value: "Ukentlig", label: "Plan-regenerering" },
            { value: "âˆž", label: "Coach-samtaler" },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-3xl sm:text-4xl font-black text-[#FC5200] tabular-nums">{stat.value}</div>
              <div className="text-sm text-[#5A5A54] mt-1.5 font-medium">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="funksjoner" className="py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
              Ikke en mal.<br className="sm:hidden" /> En ekte trener.
            </h2>
            <p className="text-[#9A9A92] text-lg max-w-xl mx-auto leading-relaxed">
              Alle andre apper gir deg samme plan som alle andre. RunAI starter fra bunn â€” for deg.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className={`bg-[#1A1A17] border border-[#2E2E29] rounded-2xl p-7 hover:border-[#FC5200]/30 transition-all duration-200 group ${i === 0 ? "lg:col-span-1" : ""}`}
                >
                  <div className="w-11 h-11 bg-[#FC5200]/10 rounded-xl flex items-center justify-center mb-5 group-hover:bg-[#FC5200]/18 transition-colors">
                    <Icon size={20} className="text-[#FC5200]" />
                  </div>
                  <h3 className="font-bold text-lg mb-2.5 tracking-tight">{feature.title}</h3>
                  <p className="text-[#9A9A92] text-sm leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Plans */}
      <section id="planer" className="py-28 px-6 bg-[#111110]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
              Alle distanser.<br className="sm:hidden" /> Alle nivÃ¥er.
            </h2>
            <p className="text-[#9A9A92] text-lg">Fortell RunAI mÃ¥let ditt. Den ordner resten.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {PLANS.map((plan) => (
              <Link
                key={plan.distance}
                href="/onboarding"
                className="group relative bg-[#1A1A17] border border-[#2E2E29] rounded-2xl p-6 hover:border-[#FC5200]/40 hover:bg-[#222220] transition-all duration-200"
              >
                <div className="font-black text-2xl tracking-tight mb-1 group-hover:text-[#FC5200] transition-colors">
                  {plan.distance}
                </div>
                <div className="text-xs text-[#FC5200] font-semibold mb-1">{plan.desc}</div>
                <div className="text-xs text-[#5A5A54]">{plan.weeks}</div>
                <ArrowRight size={14} className="absolute top-6 right-6 text-[#2E2E29] group-hover:text-[#FC5200] transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">Hva lÃ¸pere sier</h2>
            <p className="text-[#9A9A92]">Ekte resultater fra ekte lÃ¸pere.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-[#1A1A17] border border-[#2E2E29] rounded-2xl p-7 flex flex-col">
                <p className="text-[#F2F2F0] text-sm leading-relaxed mb-6 flex-1">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div>
                  <div className="font-bold text-sm">{t.name}</div>
                  <div className="text-[#FC5200] text-xs font-semibold mt-0.5">{t.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="priser" className="py-28 px-6 bg-[#111110]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
              Enkel prissetting.
            </h2>
            <p className="text-[#9A9A92] text-lg">Ingen overraskelser. Avslutt nÃ¥r du vil.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {PRICING.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-7 border flex flex-col ${
                  plan.highlight
                    ? "bg-[#FC5200] border-[#FC5200] text-white"
                    : "bg-[#1A1A17] border-[#2E2E29]"
                }`}
              >
                <div className="mb-6">
                  <div className={`text-xs font-bold uppercase tracking-widest mb-2 ${plan.highlight ? "text-white/70" : "text-[#FC5200]"}`}>
                    {plan.name}
                  </div>
                  <div className="flex items-baseline gap-1.5 mb-1">
                    <span className="text-4xl font-black tracking-tight">{plan.price}</span>
                    {plan.period && <span className={`text-sm font-medium ${plan.highlight ? "text-white/70" : "text-[#9A9A92]"}`}>{plan.period}</span>}
                  </div>
                  <div className={`text-sm ${plan.highlight ? "text-white/80" : "text-[#9A9A92]"}`}>{plan.desc}</div>
                </div>

                <ul className="space-y-2.5 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <span className={`mt-0.5 shrink-0 text-base leading-none ${plan.highlight ? "text-white" : "text-[#FC5200]"}`}>âœ“</span>
                      <span className={plan.highlight ? "text-white/90" : "text-[#9A9A92]"}>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.href}
                  className={`block text-center py-3.5 rounded-xl font-bold text-sm transition-all ${
                    plan.highlight
                      ? "bg-white text-[#FC5200] hover:bg-white/90"
                      : "bg-[#252520] text-[#F2F2F0] hover:bg-[#2E2E29] border border-[#2E2E29]"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-28 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-[#FC5200]/5 rounded-full blur-[100px]" />
        </div>
        <div className="relative max-w-3xl mx-auto">
          <h2 className="text-5xl md:text-6xl font-black tracking-tight mb-6 leading-tight">
            Klar til Ã¥ bli
            <span className="text-[#FC5200]"> bedre</span>?
          </h2>
          <p className="text-[#9A9A92] text-xl mb-10 leading-relaxed">
            Slutt Ã¥ fÃ¸lge generiske planer. Begynn Ã¥ trene med en coach
            som faktisk ser pÃ¥ hva du gjÃ¸r.
          </p>
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-2.5 bg-[#FC5200] text-white px-10 py-5 rounded-xl font-bold text-xl hover:bg-[#E04800] transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            FÃ¥ din gratis plan
            <ArrowRight size={20} />
          </Link>
          <p className="text-xs text-[#5A5A54] mt-5">FÃ¸rste uke gratis Â· Inget kredittkort Â· Avslutt nÃ¥r du vil</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#2E2E29] py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-[#FC5200] rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-xs">R</span>
            </div>
            <span className="font-bold text-sm">RunAI</span>
            <span className="text-[#5A5A54] text-sm ml-2">AI-drevet lÃ¸pecoach</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-[#5A5A54]">
            <Link href="/personvern" className="hover:text-[#9A9A92] transition-colors">Personvern</Link>
            <Link href="/vilkar" className="hover:text-[#9A9A92] transition-colors">VilkÃ¥r</Link>
            <Link href="/kontakt" className="hover:text-[#9A9A92] transition-colors">Kontakt</Link>
          </div>
          <p className="text-xs text-[#5A5A54]">Â© 2026 RunAI. Alle rettigheter forbeholdt.</p>
        </div>
      </footer>
    </div>
  );
}
