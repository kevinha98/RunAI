# Coding Agent Prompt — RunAI Race Time Predictor Feature

## Context

This is the **RunAI** project — a Next.js 15 (App Router) + Expo + TypeScript monorepo with Supabase and Tailwind CSS.

- Web app: `apps/web/src/`
- Mobile app: `apps/mobile/app/`
- Shared logic lives in `apps/web/src/lib/`
- Existing dashboard pages: `apps/web/src/app/dashboard/{coach,plan,progress,checkin,settings,strength}/`

**Before writing any code, read `running-race-predictor.md` in this folder** — it contains all formulas, scientific citations, decision logic, and edge cases.

---

## What to build

### 1. Core prediction library — `apps/web/src/lib/race-predictor.ts`

A pure TypeScript module (no external dependencies) with the following exports:

```typescript
// All times in seconds, all distances in meters internally

export function cameronPredict(knownTime: number, knownDist: number, targetDist: number): number
export function riegelPredict(knownTime: number, knownDist: number, targetDist: number, k?: number): number
export function personalKPredict(time1: number, dist1: number, time2: number, dist2: number, targetDist: number): { time: number; k: number }
export function vdot(raceTime: number, distanceMeters: number): number
export function predictFromVdot(vdotScore: number, targetDist: number): number
export function trainingPaces(vdotScore: number): TrainingPaces  // Easy, Marathon, Threshold, Interval, Rep

export function predict(input: PredictorInput): PredictorResult
// PredictorInput: { fiveK?: number; tenK?: number; targetDist: number }
// PredictorResult: { primary: number; optimistic: number; conservative: number; method: string; k?: number; warning?: string }

export function formatTime(seconds: number): string  // "1:32:45" or "22:14"
export function parseTime(str: string): number        // "1:32:45" or "22:14" -> seconds
```

Implement all four methods from `running-race-predictor.md`:
- **Method A**: Dave Cameron formula (primary when only one race input)
- **Method B**: Riegel k=1.06 (cross-check / fallback)
- **Method C**: Personal fatigue exponent from two race inputs (primary when both 5K + 10K given)
- **Method D**: Jack Daniels VDOT (for training paces)

Range output: optimistic = predicted x 0.98, conservative = predicted x 1.03

---

### 2. New dashboard page — `apps/web/src/app/dashboard/predict/page.tsx`

A new page at `/dashboard/predict`. Follow the same layout/style as existing dashboard pages — check `dashboard/page.tsx` and `dashboard/plan/` for patterns.

**UI sections:**

1. **Input section**
   - 5K personal best (optional, format: mm:ss)
   - 10K personal best (optional, format: mm:ss)
   - At least one must be filled to enable prediction

2. **Results section**
   - Primary prediction (large, prominent)
   - Range bar: optimistic <-> conservative
   - Which method was used (shown subtly)
   - If both 5K + 10K given: show personal k value with tooltip explanation
   - Separate result cards for: 10K, **Half Marathon** (primary), Marathon (with accuracy warning)

3. **Training paces section** (collapsible)
   - VDOT score
   - Table: Easy, Marathon, Threshold, Interval, Repetition paces in min/km

4. **How it works** (collapsible footer)
   - 2-3 sentences on the science
   - Links to Riegel (1981) and Vickers & Vertosick (2016) DOI: 10.1186/s13102-016-0052-y

**Warnings to show:**
- Marathon: "Noyaktigheten er lavere for maraton — opp til pluss/minus 10 min avvik er vanlig"
- k > 1.12: "Din personlige k-faktor antyder at du taper tempo mer enn gjennomsnittet ved lengre distanser"
- Cameron and Riegel differ by > 3 min: show both and note the discrepancy

---

### 3. Add to sidebar — `apps/web/src/app/dashboard/DashboardSidebar.tsx`

Add a "Tidsprediksjon" nav link pointing to `/dashboard/predict`. Match existing nav item style exactly.

---

## Implementation rules

- TypeScript strict — no `any`, proper types throughout
- Pure math only in `race-predictor.ts` — no imports, no side effects, easily unit-testable
- Work in **seconds and meters** internally; convert to display format only in the UI
- The page should be a Client Component (`"use client"`) — it is fully interactive
- No new npm dependencies — use only what is already in `apps/web/package.json`
- Follow existing Tailwind class conventions — check neighboring components first
- Add `data-testid` attributes to input fields and result cards

---

## Edge cases (from `running-race-predictor.md`)

- Input time zero or negative -> validation error, disable submit
- Only one race time -> use Cameron, label result clearly
- k outside [1.00, 1.25] -> warn user (likely a bad race day)
- D1 === D2 -> return T1 unchanged
- VDOT solver: bisection method, converge to < 0.1 sec

---

## Files to create/modify

| File | Action |
|---|---|
| `apps/web/src/lib/race-predictor.ts` | **Create** — core prediction engine |
| `apps/web/src/app/dashboard/predict/page.tsx` | **Create** — new dashboard page |
| `apps/web/src/app/dashboard/DashboardSidebar.tsx` | **Modify** — add nav link |

Do not touch any other files unless strictly necessary.

---

## Reference files in this folder

| File | Purpose |
|---|---|
| `running-race-predictor.md` | Full scientific spec — all formulas, citations, edge cases. **Read this first.** |
| `CODING_AGENT_PROMPT.md` | This file |
