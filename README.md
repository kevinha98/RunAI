<div align="center">

<img src="https://img.shields.io/badge/AI--drevet-Claude%20Sonnet-22c55e?style=for-the-badge&logo=anthropic&logoColor=white" />
<img src="https://img.shields.io/badge/Next.js-15-000000?style=for-the-badge&logo=next.js&logoColor=white" />
<img src="https://img.shields.io/badge/Expo-55-000020?style=for-the-badge&logo=expo&logoColor=white" />
<img src="https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
<img src="https://img.shields.io/badge/Turborepo-monorepo-EF4444?style=for-the-badge&logo=turborepo&logoColor=white" />
<img src="https://img.shields.io/badge/Lisens-MIT-22c55e?style=for-the-badge" />

<br /><br />

<img src="https://img.shields.io/badge/Status-Under%20utvikling-f59e0b?style=flat-square" />
<img src="https://img.shields.io/github/last-commit/kevinha98/RunAI?style=flat-square&color=22c55e" />
<img src="https://img.shields.io/github/languages/top/kevinha98/RunAI?style=flat-square&color=3178c6" />

<br /><br />

```
██████╗ ██╗   ██╗███╗   ██╗ █████╗ ██╗
██╔══██╗██║   ██║████╗  ██║██╔══██╗██║
██████╔╝██║   ██║██╔██╗ ██║███████║██║
██╔══██╗██║   ██║██║╚██╗██║██╔══██║██║
██║  ██║╚██████╔╝██║ ╚████║██║  ██║██║
╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝
```

# RunAI — Din AI-drevne løpecoach

**Ekte AI-genererte treningsplaner som tilpasser seg deg uke for uke.**  
Ikke maler. Ikke statiske planer. Claude analyserer løpingen din og justerer kontinuerlig.

[**Kom i gang →**](#kom-i-gang) · [**Funksjoner**](#funksjoner) · [**Teknologi**](#teknologi) · [**Bidra**](#bidra)

</div>

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
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
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
- [ ] Supabase-autentisering
- [ ] Strava-integrasjon
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
