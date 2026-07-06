<div align="center">

<img src="https://img.shields.io/badge/Status-Arkivert-red?style=for-the-badge" />
<img src="https://img.shields.io/badge/Next.js-15-000000?style=for-the-badge&logo=next.js&logoColor=white" />
<img src="https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
<img src="https://img.shields.io/badge/Lisens-MIT-22c55e?style=for-the-badge" />

<br /><br />

```
██████╗ ██╗   ██╗███╗   ██╗ █████╗ ██╗
██╔══██╗██║   ██║████╗  ██║██╔══██╗██║
██████╔╝██║   ██║██╔██╗ ██║███████║██║
██╔══██╗██║   ██║██║╚██╗██║██╔══██║██║
██║  ██║╚██████╔╝██║ ╚████║██║  ██║██║
╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝
```

# RunAI — Arkivert

</div>

> **⚠️ Dette prosjektet er arkivert og ikke lenger i aktiv utvikling.**
>
> **Årsak:** Strava avviklet gratis API-tilgang for Standard Tier-utviklere i juli 2026 og innførte betalingsmur. Siden Strava-integrasjonen var kjernen i datainnhentingen (løpsdata, aktivitetssynkronisering), er appen ikke lenger funksjonell uten betydelige kostnader eller ny datakilde.
>
> Vercel-prosjektet er avviklet. Koden er bevart som referanse.

---

## Hva var RunAI?

RunAI var en AI-drevet løpecoach-app som brukte **Claude** (Anthropic) til å generere og tilpasse treningsplaner basert på faktisk gjennomføring via Strava — ikke generiske maler.

Bygget som et personlig prosjekt med mål om sub 2:00 halvmaraton på Bergen City Marathon 2027.

### Hva som ble bygget

| Funksjon | Status |
|---|---|
| 🧠 AI-coach chat (Claude, streaming SSE) | ✅ Ferdig |
| 🔄 Per-bruker Strava OAuth + synk | ✅ Ferdig |
| 📊 Løpstidsprediksjon (Cameron, Riegel, VDOT) | ✅ Ferdig |
| 📋 Ukentlig rapport + AI-analyse + planforslag | ✅ Ferdig |
| 📅 52-ukers treningsplan (Grunntrening → Nedtrapping) | ✅ Ferdig |
| ⚙️ Innstillingsside + Strava disconnect | ✅ Ferdig |
| 📱 Mobil-responsivt design (sidebar/bunnav) | ✅ Ferdig |
| 🗄️ Supabase DB med RLS (user_strava, weekly_checkins) | ✅ Ferdig |

---

## Teknologi

```
RunAI/
├── apps/
│   ├── web/          # Next.js 15 (App Router), React 19, Tailwind CSS 4
│   └── mobile/       # Expo 55 (React Native) — ikke fullført
├── packages/
│   ├── ai/           # Claude API-integrasjon
│   ├── db/           # Supabase-klient
│   └── types/        # Delte TypeScript-typer
└── supabase/
    └── migrations/   # SQL-migrasjoner (user_strava, weekly_checkins)
```

| Lag | Teknologi |
|---|---|
| **Web** | Next.js 15, React 19, Tailwind CSS 4 |
| **AI** | Claude Sonnet via Anthropic SDK, streaming SSE |
| **Database** | Supabase (PostgreSQL) med Row Level Security |
| **Auth** | Supabase Auth + Google OAuth |
| **Strava** | OAuth 2.0, aktivitetssynkronisering, webhooks |

---

## Hvorfor det stoppet

Strava kunngjorde i 2026 at Standard Tier API-tilgang ikke lenger er gratis. Betingelsene krever nå betaling for produksjonsbruk utover svært lave grenser. For et personlig hobbyprosjekt er dette ikke bærekraftig.

Alternativer som kunne ha reddet prosjektet:
- Bytte til **Garmin Connect API** eller **Apple HealthKit** (krever iOS-app)
- Bruker laster opp `.fit`/`.gpx`-filer manuelt
- Integrere mot **Polar**, **Suunto** eller **Coros** sine API-er

Koden er strukturert slik at datakildene er isolert i `apps/web/src/lib/strava.ts` og `apps/web/src/lib/db/user-strava.ts` — en ny datakilde kan teoretisk skrus inn uten å endre resten av appen.

---

## Lisens

MIT © Kevin Ha

---

## Hva er RunAI?

RunAI er en AI-drevet løpecoach-app som bruker **Claude** (Anthropic) til å generere og tilpasse treningsplaner basert på faktisk gjennomføring, prestasjon og dagsform — ikke generiske maler.

Konkurransedyktig alternativ til [Runna](https://runna.com), med én viktig forskjell: **planen skrives om hver uke basert på hva du faktisk gjorde.**

### Bakgrunn

Prosjektet startet med et konkret treningsbehov: sub 2:00 halvmaraton på Bergen City Marathon med 15–30 km/uke som utgangspunkt. Programmet i [`halvmaraton_program_fullstendig.txt`](halvmaraton_program_fullstendig.txt) er den faktiske treningskonteksten som driver AI-coachens forståelse.

---

## Funksjoner

| Funksjon | Beskrivelse |
|---|---|
| 🧠 **AI-genererte planer** | Claude bygger din plan fra bunnen — 5K, 10K, halvmaraton, maraton, ultra |
| 🔄 **Ukentlig tilpasning** | Planen regenereres automatisk basert på hva du faktisk løp |
| 💬 **AI-coach 24/7** | Still spørsmål om dagens økt, fatigue, skader, taktikk |
| 📊 **Prediksjon** | Realistisk løpstidsprediksjon med konfidensintervall |
| ⌚ **Synkronisering** | Apple Health, Google Health Connect, Strava, Garmin |
| 💪 **Styrke og mobilitet** | Løpsspesifikke tilleggsøkter generert av AI |
| 📱 **Web + mobil** | Next.js webapp og Expo-app (iOS + Android) |

---

## Skjermbilder

> Kommer snart — appen er under aktiv utvikling.

---

## Teknologi

### Monorepo-struktur

```
RunAI/
├── apps/
│   ├── web/                    # Next.js 15 (App Router)
│   └── mobile/                 # Expo 55 (React Native)
├── packages/
│   ├── ai/                     # Claude API-integrasjon, plangenrering, coach
│   ├── db/                     # Prisma-schema + Supabase-klient
│   ├── types/                  # Delte TypeScript-typer
│   └── ui/                     # Delte farger, utilities
├── turbo.json                  # Turborepo-konfigurasjon
└── package.json                # Rotpakke (npm workspaces)
```

### Stack

| Lag | Teknologi |
|---|---|
| **Web-frontend** | Next.js 15 (App Router), React 19, Tailwind CSS 4 |
| **Mobil** | Expo 55, React Native 0.79, NativeWind |
| **AI-lag** | Claude Sonnet (`@anthropic-ai/sdk`), streaming SSE |
| **Database** | Supabase (PostgreSQL), Prisma ORM |
| **Auth** | Supabase Auth + `@supabase/ssr` |
| **Tilstandshåndtering** | TanStack Query v5 |
| **Bygg** | Turborepo, TypeScript 5.7 |
| **Validering** | Zod |

### API-endepunkter

| Endepunkt | Metode | Beskrivelse |
|---|---|---|
| `/api/coach` | `POST` | Streaming Claude-coach (SSE) |
| `/api/generate-plan` | `POST` | Generer komplett treningsplan som JSON |
| `/api/strava/connect` | `GET` | Start Strava OAuth 2.0-flyt |
| `/api/strava/callback` | `GET` | OAuth-callback, hent og lagre tokens |
| `/api/strava/athlete` | `GET` | Hent innlogget Strava-utøver |
| `/api/strava/activities` | `GET` | Hent løpsaktiviteter fra Strava |
| `/api/strava/sync` | `POST` | Full aktivitetssynkronisering |
| `/api/strava/refresh` | `POST` | Oppdater Strava-token |
| `/api/strava/subscribe` | `POST` | Registrer Strava-webhook |
| `/api/strava/webhook` | `GET/POST` | Motta sanntidshendelser fra Strava |
| `/api/debug` | `GET` | Debug-informasjon (dev) |

---

## Kom i gang

### Forutsetninger

- Node.js ≥ 20
- npm ≥ 10
- Anthropic API-nøkkel ([hent her](https://console.anthropic.com))
- Supabase-prosjekt ([opprett her](https://supabase.com))

### Installasjon

```bash
# Klon repoet
git clone https://github.com/kevinha98/RunAI.git
cd RunAI

# Installer avhengigheter
npm install --legacy-peer-deps

# Installer web-avhengigheter
cd apps/web
npm install --legacy-peer-deps
```

### Miljøvariabler

Kopier eksempelfilen og fyll inn verdiene:

```bash
cp apps/web/.env.example apps/web/.env.local
```

```env
# apps/web/.env.local

# LLM — Radical Gateway (primær) eller Anthropic direkte (fallback)
RADICAL_GATEWAY_TOKEN=your_gateway_token_here
# ANTHROPIC_API_KEY=sk-ant-...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Strava OAuth 2.0 (registrer app på https://www.strava.com/settings/api)
STRAVA_CLIENT_ID=your_strava_client_id
STRAVA_CLIENT_SECRET=your_strava_client_secret
STRAVA_WEBHOOK_VERIFY_TOKEN=your_verify_token_here

# Base URL for OAuth-callback
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Database

```bash
# Initialiser Prisma og push schema til Supabase
cd packages/db
npx prisma db push
npx prisma generate
```

### Utvikling

```bash
# Start web-appen (fra rotnivå)
cd apps/web
npm run dev
# → http://localhost:3000

# Start Expo-appen (fra rotnivå)
cd apps/mobile
npx expo start
```

---

## Treningskontekst

Filen [`halvmaraton_program_fullstendig.txt`](halvmaraton_program_fullstendig.txt) inneholder den fullstendige treningskonteksten som brukes av AI-coachen:

- **Mål**: Sub 2:00 halvmaraton (Bergen City Marathon)
- **Utgangspunkt**: 5K på ~25 min, 15–30 km/uke
- **Treningssoner**: Rolig (6:15–6:45), Terskel (5:15–5:25), Intervall (4:50–5:00)
- **Ukestruktur**: 4 løpeøkter + 1 styrkeøkt
- **12-ukers plan** med konkret uke-for-uke-progresjon

Denne filen fungerer som grunnlag for AI-coachens systemprompt og tilpasses dynamisk etter gjennomføring.

---

## Treningssoner

| Sone | Fart | Bruk |
|---|---|---|
| Rolig | 6:15–6:45 min/km | Hverdagsøkter, restitusjonsløp |
| Langtur | 6:05–6:30 min/km | Søndagslangtur |
| Terskel | 5:15–5:25 min/km | Nøkkeløkt — bygger motor |
| Intervall | 4:50–5:00 min/km | Fartsstyrke |
| Konkurransefart | ~5:40 min/km | Halvmaratonmål |

---

## Prosjektstatus

- [x] Monorepo-struktur (Turborepo)
- [x] Next.js 15 webapp med landing page, onboarding, dashboard
- [x] AI-coach streaming (Claude SSE)
- [x] Plangenrering via Claude API
- [x] Prisma-schema (brukere, planer, uker, økter, aktiviteter)
- [x] Expo mobil-app med 4 faner (I dag, Plan, Coach, Fremgang)
- [x] Treningskontekst fra halvmaratonprogrammet
- [x] Supabase-autentisering (Google OAuth via Supabase Auth)
- [x] Strava-integrasjon (OAuth 2.0, aktivitetssynk, sanntids-webhook)
- [x] Dashboard med Coach, Plan, Fremgang og Styrke-sider
- [ ] Apple Health / Health Connect-synkronisering
- [ ] Ukentlig auto-regenerering av plan
- [ ] Push-varsler
- [ ] iOS/Android App Store-publisering

---

## Bidra

Bidrag er velkomne. Følg disse stegene:

```bash
# 1. Fork repoet
# 2. Opprett en feature-branch
git checkout -b feat/min-nye-funksjon

# 3. Gjør endringer og commit
git commit -m "feat: legg til ny funksjon"

# 4. Push til din fork
git push origin feat/min-nye-funksjon

# 5. Åpne en Pull Request
```

### Konvensjoner

- **Commits**: [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `refactor:`)
- **Språk**: TypeScript overalt — ingen `any` uten god grunn
- **Komponentstruktur**: Server Components som standard, `"use client"` kun ved behov

---

## Lisens

MIT © 2026 Kevin Ha

---

<div align="center">

Bygget med [Claude](https://anthropic.com) · [Next.js](https://nextjs.org) · [Expo](https://expo.dev) · [Supabase](https://supabase.com)

*"Treningsplanen din skal lære seg deg — ikke omvendt."*

</div>
