/**
 * Shared training plan data — used by the plan page and the AI coach tools.
 * Race: Bergen City Marathon 24 April 2027.
 * Plan start: Monday 5 May 2026 (week 1).
 */

export type Phase = "Grunntrening" | "Bygging" | "Topp" | "Nedtrapping";

export interface Session {
  day: string;
  type: string;
  distance: string;
  pace: string;
  icon: string;
}

export interface Week {
  week: number;
  phase: Phase;
  totalKm: number;
  sessions: Session[];
}

export const PLAN_START = new Date(2026, 4, 5); // 5 May 2026
export const RACE_DATE = new Date(2027, 3, 24); // 24 April 2027
export const TOTAL_WEEKS = 52;

/** Returns the current plan week number (1-based), clamped to 1–TOTAL_WEEKS. */
export function getCurrentWeek(): number {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const elapsed = Date.now() - PLAN_START.getTime();
  return Math.min(TOTAL_WEEKS, Math.max(1, Math.floor(elapsed / msPerWeek) + 1));
}

export const SESSION_ICONS: Record<string, string> = {
  "Lett løping": "🏃",
  Styrke: "💪",
  Terskelløkt: "⚡",
  Intervall: "🔥",
  Langkjøring: "🛣️",
  Hvile: "😴",
  Mobilitet: "🧘",
};

export const WEEKS: Week[] = [
  {
    week: 1, phase: "Grunntrening", totalKm: 32,
    sessions: [
      { day: "Man", type: "Lett løping", distance: "6 km", pace: "6:00/km", icon: "🏃" },
      { day: "Tir", type: "Styrke", distance: "30 min", pace: "Kjerneaktivering", icon: "💪" },
      { day: "Ons", type: "Lett løping", distance: "8 km", pace: "5:55/km", icon: "🏃" },
      { day: "Tor", type: "Hvile", distance: "—", pace: "Restitusjon", icon: "😴" },
      { day: "Fre", type: "Lett løping", distance: "6 km", pace: "6:00/km", icon: "🏃" },
      { day: "Lør", type: "Langkjøring", distance: "12 km", pace: "6:10/km", icon: "🛣️" },
      { day: "Søn", type: "Hvile", distance: "—", pace: "Restitusjon", icon: "😴" },
    ],
  },
  {
    week: 2, phase: "Grunntrening", totalKm: 36,
    sessions: [
      { day: "Man", type: "Lett løping", distance: "7 km", pace: "5:55/km", icon: "🏃" },
      { day: "Tir", type: "Styrke", distance: "35 min", pace: "Bein og hofte", icon: "💪" },
      { day: "Ons", type: "Terskelløkt", distance: "8 km", pace: "5:05/km", icon: "⚡" },
      { day: "Tor", type: "Hvile", distance: "—", pace: "Restitusjon", icon: "😴" },
      { day: "Fre", type: "Lett løping", distance: "6 km", pace: "6:00/km", icon: "🏃" },
      { day: "Lør", type: "Langkjøring", distance: "15 km", pace: "6:05/km", icon: "🛣️" },
      { day: "Søn", type: "Mobilitet", distance: "20 min", pace: "Dynamisk", icon: "🧘" },
    ],
  },
  {
    week: 3, phase: "Grunntrening", totalKm: 40,
    sessions: [
      { day: "Man", type: "Lett løping", distance: "8 km", pace: "5:50/km", icon: "🏃" },
      { day: "Tir", type: "Styrke", distance: "40 min", pace: "Full kropp", icon: "💪" },
      { day: "Ons", type: "Terskelløkt", distance: "10 km", pace: "5:00/km", icon: "⚡" },
      { day: "Tor", type: "Hvile", distance: "—", pace: "Restitusjon", icon: "😴" },
      { day: "Fre", type: "Lett løping", distance: "6 km", pace: "5:55/km", icon: "🏃" },
      { day: "Lør", type: "Langkjøring", distance: "16 km", pace: "6:00/km", icon: "🛣️" },
      { day: "Søn", type: "Hvile", distance: "—", pace: "Restitusjon", icon: "😴" },
    ],
  },
  {
    week: 4, phase: "Grunntrening", totalKm: 32,
    sessions: [
      { day: "Man", type: "Lett løping", distance: "6 km", pace: "6:00/km", icon: "🏃" },
      { day: "Tir", type: "Mobilitet", distance: "25 min", pace: "Aktiv restitusjon", icon: "🧘" },
      { day: "Ons", type: "Lett løping", distance: "8 km", pace: "5:55/km", icon: "🏃" },
      { day: "Tor", type: "Hvile", distance: "—", pace: "Restitusjon", icon: "😴" },
      { day: "Fre", type: "Lett løping", distance: "6 km", pace: "6:05/km", icon: "🏃" },
      { day: "Lør", type: "Langkjøring", distance: "12 km", pace: "6:10/km", icon: "🛣️" },
      { day: "Søn", type: "Hvile", distance: "—", pace: "Restitusjon", icon: "😴" },
    ],
  },
  {
    week: 5, phase: "Bygging", totalKm: 44,
    sessions: [
      { day: "Man", type: "Lett løping", distance: "8 km", pace: "5:45/km", icon: "🏃" },
      { day: "Tir", type: "Styrke", distance: "45 min", pace: "Løpeøvelser", icon: "💪" },
      { day: "Ons", type: "Terskelløkt", distance: "10 km", pace: "4:50/km", icon: "⚡" },
      { day: "Tor", type: "Hvile", distance: "—", pace: "Restitusjon", icon: "😴" },
      { day: "Fre", type: "Lett løping", distance: "6 km", pace: "5:50/km", icon: "🏃" },
      { day: "Lør", type: "Langkjøring", distance: "18 km", pace: "6:00/km", icon: "🛣️" },
      { day: "Søn", type: "Hvile", distance: "—", pace: "Restitusjon", icon: "😴" },
    ],
  },
  {
    week: 6, phase: "Bygging", totalKm: 48,
    sessions: [
      { day: "Man", type: "Lett løping", distance: "9 km", pace: "5:45/km", icon: "🏃" },
      { day: "Tir", type: "Intervall", distance: "10 km", pace: "4:30/km", icon: "🔥" },
      { day: "Ons", type: "Terskelløkt", distance: "10 km", pace: "4:48/km", icon: "⚡" },
      { day: "Tor", type: "Styrke", distance: "40 min", pace: "Bein og kjernen", icon: "💪" },
      { day: "Fre", type: "Lett løping", distance: "7 km", pace: "5:50/km", icon: "🏃" },
      { day: "Lør", type: "Langkjøring", distance: "19 km", pace: "5:55/km", icon: "🛣️" },
      { day: "Søn", type: "Hvile", distance: "—", pace: "Restitusjon", icon: "😴" },
    ],
  },
  {
    week: 7, phase: "Bygging", totalKm: 50,
    sessions: [
      { day: "Man", type: "Lett løping", distance: "9 km", pace: "5:40/km", icon: "🏃" },
      { day: "Tir", type: "Terskelløkt", distance: "12 km", pace: "4:45/km", icon: "⚡" },
      { day: "Ons", type: "Styrke", distance: "45 min", pace: "Full kropp", icon: "💪" },
      { day: "Tor", type: "Lett løping", distance: "7 km", pace: "5:50/km", icon: "🏃" },
      { day: "Fre", type: "Hvile", distance: "—", pace: "Restitusjon", icon: "😴" },
      { day: "Lør", type: "Langkjøring", distance: "20 km", pace: "5:55/km", icon: "🛣️" },
      { day: "Søn", type: "Mobilitet", distance: "20 min", pace: "Aktiv hvile", icon: "🧘" },
    ],
  },
  {
    week: 8, phase: "Bygging", totalKm: 40,
    sessions: [
      { day: "Man", type: "Lett løping", distance: "7 km", pace: "5:50/km", icon: "🏃" },
      { day: "Tir", type: "Terskelløkt", distance: "8 km", pace: "4:50/km", icon: "⚡" },
      { day: "Ons", type: "Mobilitet", distance: "25 min", pace: "Aktiv restitusjon", icon: "🧘" },
      { day: "Tor", type: "Hvile", distance: "—", pace: "Restitusjon", icon: "😴" },
      { day: "Fre", type: "Lett løping", distance: "6 km", pace: "5:55/km", icon: "🏃" },
      { day: "Lør", type: "Langkjøring", distance: "14 km", pace: "6:05/km", icon: "🛣️" },
      { day: "Søn", type: "Hvile", distance: "—", pace: "Restitusjon", icon: "😴" },
    ],
  },
  {
    week: 9, phase: "Topp", totalKm: 54,
    sessions: [
      { day: "Man", type: "Lett løping", distance: "9 km", pace: "5:40/km", icon: "🏃" },
      { day: "Tir", type: "Intervall", distance: "11 km", pace: "4:25/km", icon: "🔥" },
      { day: "Ons", type: "Terskelløkt", distance: "12 km", pace: "4:42/km", icon: "⚡" },
      { day: "Tor", type: "Styrke", distance: "45 min", pace: "Bein og hofte", icon: "💪" },
      { day: "Fre", type: "Lett løping", distance: "8 km", pace: "5:45/km", icon: "🏃" },
      { day: "Lør", type: "Langkjøring", distance: "21 km", pace: "5:50/km", icon: "🛣️" },
      { day: "Søn", type: "Hvile", distance: "—", pace: "Restitusjon", icon: "😴" },
    ],
  },
  {
    week: 10, phase: "Topp", totalKm: 56,
    sessions: [
      { day: "Man", type: "Lett løping", distance: "10 km", pace: "5:40/km", icon: "🏃" },
      { day: "Tir", type: "Intervall", distance: "12 km", pace: "4:22/km", icon: "🔥" },
      { day: "Ons", type: "Terskelløkt", distance: "12 km", pace: "4:40/km", icon: "⚡" },
      { day: "Tor", type: "Hvile", distance: "—", pace: "Restitusjon", icon: "😴" },
      { day: "Fre", type: "Lett løping", distance: "8 km", pace: "5:45/km", icon: "🏃" },
      { day: "Lør", type: "Langkjøring", distance: "22 km", pace: "5:48/km", icon: "🛣️" },
      { day: "Søn", type: "Mobilitet", distance: "20 min", pace: "Aktiv hvile", icon: "🧘" },
    ],
  },
  {
    week: 11, phase: "Nedtrapping", totalKm: 42,
    sessions: [
      { day: "Man", type: "Lett løping", distance: "8 km", pace: "5:45/km", icon: "🏃" },
      { day: "Tir", type: "Terskelløkt", distance: "8 km", pace: "4:42/km", icon: "⚡" },
      { day: "Ons", type: "Styrke", distance: "30 min", pace: "Lett", icon: "💪" },
      { day: "Tor", type: "Hvile", distance: "—", pace: "Restitusjon", icon: "😴" },
      { day: "Fre", type: "Lett løping", distance: "6 km", pace: "5:50/km", icon: "🏃" },
      { day: "Lør", type: "Langkjøring", distance: "16 km", pace: "5:55/km", icon: "🛣️" },
      { day: "Søn", type: "Hvile", distance: "—", pace: "Restitusjon", icon: "😴" },
    ],
  },
  {
    week: 12, phase: "Nedtrapping", totalKm: 28,
    sessions: [
      { day: "Man", type: "Lett løping", distance: "6 km", pace: "5:50/km", icon: "🏃" },
      { day: "Tir", type: "Lett løping", distance: "5 km", pace: "5:55/km", icon: "🏃" },
      { day: "Ons", type: "Mobilitet", distance: "20 min", pace: "Lett", icon: "🧘" },
      { day: "Tor", type: "Hvile", distance: "—", pace: "Restitusjon", icon: "😴" },
      { day: "Fre", type: "Lett løping", distance: "4 km", pace: "6:00/km", icon: "🏃" },
      { day: "Lør", type: "Hvile", distance: "—", pace: "Forberedelse", icon: "😴" },
      { day: "Søn", type: "LØP!", distance: "21,1 km", pace: "Målfart!", icon: "🏅" },
    ],
  },
];
