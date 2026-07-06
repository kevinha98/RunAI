<div align="center">

![Status](https://img.shields.io/badge/Status-Arkivert-red?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-15-000000?style=for-the-badge&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Lisens](https://img.shields.io/badge/Lisens-MIT-22c55e?style=for-the-badge)

# RunAI — Arkivert

</div>

> **⚠️ Dette prosjektet er arkivert og ikke lenger i aktiv utvikling.**
>
> **Årsak:** Strava avviklet gratis API-tilgang for Standard Tier-utviklere i
> juli 2026 og innførte betalingsmur. Siden Strava-integrasjonen var kjernen i
> datainnhentingen, er appen ikke lenger funksjonell uten betydelige kostnader
> eller en ny datakilde. Vercel-prosjektet er avviklet. Koden er bevart som
> referanse.

---

## Hva var RunAI?

RunAI var en AI-drevet løpecoach-app som brukte **Claude** (Anthropic) til å
generere og tilpasse treningsplaner basert på faktisk gjennomføring via Strava
— ikke generiske maler.

### Hva som ble bygget

| Funksjon | Status |
| --- | --- |
| 🧠 AI-coach chat (Claude, streaming SSE) | ✅ Ferdig |
| 🔄 Per-bruker Strava OAuth + synk | ✅ Ferdig |
| 📊 Løpstidsprediksjon (Cameron, Riegel, VDOT) | ✅ Ferdig |
| 📋 Ukentlig rapport + AI-analyse + planforslag | ✅ Ferdig |
| 📅 52-ukers treningsplan (Grunntrening → Nedtrapping) | ✅ Ferdig |
| ⚙️ Innstillingsside + Strava disconnect | ✅ Ferdig |
| 📱 Mobil-responsivt design (sidebar/bunnav) | ✅ Ferdig |
| 🗄️ Supabase DB med RLS | ✅ Ferdig |

---

## Teknologi

```text
RunAI/
├── apps/
│   ├── web/       # Next.js 15 (App Router), React 19, Tailwind CSS 4
│   └── mobile/    # Expo 55 (React Native) — ikke fullført
├── packages/
│   ├── ai/        # Claude API-integrasjon
│   ├── db/        # Supabase-klient
│   └── types/     # Delte TypeScript-typer
└── supabase/
    └── migrations/ # SQL-migrasjoner
```

| Lag | Teknologi |
| --- | --- |
| **Web** | Next.js 15, React 19, Tailwind CSS 4 |
| **AI** | Claude Sonnet via Anthropic SDK, streaming SSE |
| **Database** | Supabase (PostgreSQL) med Row Level Security |
| **Auth** | Supabase Auth + Google OAuth |
| **Strava** | OAuth 2.0, aktivitetssynkronisering, webhooks |

---

## Hvorfor det stoppet

Strava kunngjorde i 2026 at Standard Tier API-tilgang ikke lenger er gratis.
For et hobbyprosjekt er betingelsene ikke bærekraftige.

Alternativer for en eventuell gjenopplivning:

- Bytte til **Garmin Connect API** eller **Apple HealthKit**
- Manuell opplasting av `.fit`/`.gpx`-filer
- Integrere mot **Polar**, **Suunto** eller **Coros** sine API-er

Datakildene er isolert i `apps/web/src/lib/strava.ts` og
`apps/web/src/lib/db/user-strava.ts` — en ny kilde kan skrus inn uten å
endre resten av appen.

---

## Lisens

MIT
