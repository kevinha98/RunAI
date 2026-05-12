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

/** Returns a short interval description for display in session cards, e.g. "5×1000 m" or "3×15 min". */
export function getIntervalLabel(type: string, distStr: string): string | undefined {
  if (type !== "Terskel\u00f8kt" && type !== "Intervall" && type !== "Terskelintervall") return undefined;
  const km = parseFloat(distStr);
  if (isNaN(km) || km <= 0) return undefined;

  if (type === "Intervall") {
    // ~4 km warmup+cooldown, 1 km per rep
    const reps = Math.max(4, Math.round(km - 4));
    return `${reps}\u00d71000 m`;
  }

  // Terskel\u00f8kt — time-based
  if (km <= 8) return "2\u00d720 min";
  if (km <= 10) return "3\u00d715 min";
  if (km <= 11) return "3\u00d715 min";
  return "4\u00d712 min";
}

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
  // --- Uke 13–26: Bygging ---
  {
    week: 13, phase: "Bygging", totalKm: 48,
    sessions: [
      { day: "Man", type: "Lett løping", distance: "8 km", pace: "5:45/km", icon: "🏃" },
      { day: "Tir", type: "Terskelløkt", distance: "10 km", pace: "4:55/km", icon: "⚡" },
      { day: "Ons", type: "Styrke", distance: "40 min", pace: "Bein og kjernen", icon: "💪" },
      { day: "Tor", type: "Lett løping", distance: "8 km", pace: "5:50/km", icon: "🏃" },
      { day: "Fre", type: "Hvile", distance: "—", pace: "Restitusjon", icon: "😴" },
      { day: "Lør", type: "Langkjøring", distance: "20 km", pace: "5:55/km", icon: "🛣️" },
      { day: "Søn", type: "Mobilitet", distance: "20 min", pace: "Aktiv hvile", icon: "🧘" },
    ],
  },
  {
    week: 14, phase: "Bygging", totalKm: 51,
    sessions: [
      { day: "Man", type: "Lett løping", distance: "9 km", pace: "5:45/km", icon: "🏃" },
      { day: "Tir", type: "Intervall", distance: "11 km", pace: "4:25/km", icon: "🔥" },
      { day: "Ons", type: "Terskelløkt", distance: "10 km", pace: "4:52/km", icon: "⚡" },
      { day: "Tor", type: "Styrke", distance: "40 min", pace: "Full kropp", icon: "💪" },
      { day: "Fre", type: "Lett løping", distance: "7 km", pace: "5:50/km", icon: "🏃" },
      { day: "Lør", type: "Langkjøring", distance: "22 km", pace: "5:50/km", icon: "🛣️" },
      { day: "Søn", type: "Hvile", distance: "—", pace: "Restitusjon", icon: "😴" },
    ],
  },
  {
    week: 15, phase: "Bygging", totalKm: 54,
    sessions: [
      { day: "Man", type: "Lett løping", distance: "10 km", pace: "5:40/km", icon: "🏃" },
      { day: "Tir", type: "Terskelløkt", distance: "12 km", pace: "4:50/km", icon: "⚡" },
      { day: "Ons", type: "Styrke", distance: "45 min", pace: "Bein og hofte", icon: "💪" },
      { day: "Tor", type: "Lett løping", distance: "8 km", pace: "5:45/km", icon: "🏃" },
      { day: "Fre", type: "Hvile", distance: "—", pace: "Restitusjon", icon: "😴" },
      { day: "Lør", type: "Langkjøring", distance: "24 km", pace: "5:50/km", icon: "🛣️" },
      { day: "Søn", type: "Mobilitet", distance: "20 min", pace: "Aktiv hvile", icon: "🧘" },
    ],
  },
  {
    week: 16, phase: "Bygging", totalKm: 38,
    sessions: [
      { day: "Man", type: "Lett løping", distance: "7 km", pace: "5:55/km", icon: "🏃" },
      { day: "Tir", type: "Mobilitet", distance: "25 min", pace: "Aktiv restitusjon", icon: "🧘" },
      { day: "Ons", type: "Lett løping", distance: "8 km", pace: "5:55/km", icon: "🏃" },
      { day: "Tor", type: "Hvile", distance: "—", pace: "Restitusjon", icon: "😴" },
      { day: "Fre", type: "Lett løping", distance: "6 km", pace: "6:00/km", icon: "🏃" },
      { day: "Lør", type: "Langkjøring", distance: "14 km", pace: "6:05/km", icon: "🛣️" },
      { day: "Søn", type: "Hvile", distance: "—", pace: "Restitusjon", icon: "😴" },
    ],
  },
  {
    week: 17, phase: "Bygging", totalKm: 54,
    sessions: [
      { day: "Man", type: "Lett løping", distance: "9 km", pace: "5:45/km", icon: "🏃" },
      { day: "Tir", type: "Intervall", distance: "11 km", pace: "4:22/km", icon: "🔥" },
      { day: "Ons", type: "Terskelløkt", distance: "11 km", pace: "4:50/km", icon: "⚡" },
      { day: "Tor", type: "Styrke", distance: "45 min", pace: "Full kropp", icon: "💪" },
      { day: "Fre", type: "Lett løping", distance: "8 km", pace: "5:50/km", icon: "🏃" },
      { day: "Lør", type: "Langkjøring", distance: "23 km", pace: "5:50/km", icon: "🛣️" },
      { day: "Søn", type: "Hvile", distance: "—", pace: "Restitusjon", icon: "😴" },
    ],
  },
  {
    week: 18, phase: "Bygging", totalKm: 57,
    sessions: [
      { day: "Man", type: "Lett løping", distance: "10 km", pace: "5:40/km", icon: "🏃" },
      { day: "Tir", type: "Terskelløkt", distance: "12 km", pace: "4:48/km", icon: "⚡" },
      { day: "Ons", type: "Styrke", distance: "45 min", pace: "Bein og hofte", icon: "💪" },
      { day: "Tor", type: "Lett løping", distance: "9 km", pace: "5:45/km", icon: "🏃" },
      { day: "Fre", type: "Hvile", distance: "—", pace: "Restitusjon", icon: "😴" },
      { day: "Lør", type: "Langkjøring", distance: "25 km", pace: "5:48/km", icon: "🛣️" },
      { day: "Søn", type: "Mobilitet", distance: "20 min", pace: "Aktiv hvile", icon: "🧘" },
    ],
  },
  {
    week: 19, phase: "Bygging", totalKm: 60,
    sessions: [
      { day: "Man", type: "Lett løping", distance: "10 km", pace: "5:40/km", icon: "🏃" },
      { day: "Tir", type: "Intervall", distance: "12 km", pace: "4:20/km", icon: "🔥" },
      { day: "Ons", type: "Terskelløkt", distance: "12 km", pace: "4:47/km", icon: "⚡" },
      { day: "Tor", type: "Styrke", distance: "45 min", pace: "Full kropp", icon: "💪" },
      { day: "Fre", type: "Lett løping", distance: "8 km", pace: "5:45/km", icon: "🏃" },
      { day: "Lør", type: "Langkjøring", distance: "27 km", pace: "5:45/km", icon: "🛣️" },
      { day: "Søn", type: "Hvile", distance: "—", pace: "Restitusjon", icon: "😴" },
    ],
  },
  {
    week: 20, phase: "Bygging", totalKm: 40,
    sessions: [
      { day: "Man", type: "Lett løping", distance: "7 km", pace: "5:55/km", icon: "🏃" },
      { day: "Tir", type: "Mobilitet", distance: "25 min", pace: "Aktiv restitusjon", icon: "🧘" },
      { day: "Ons", type: "Lett løping", distance: "8 km", pace: "5:55/km", icon: "🏃" },
      { day: "Tor", type: "Hvile", distance: "—", pace: "Restitusjon", icon: "😴" },
      { day: "Fre", type: "Terskelløkt", distance: "8 km", pace: "4:52/km", icon: "⚡" },
      { day: "Lør", type: "Langkjøring", distance: "15 km", pace: "6:00/km", icon: "🛣️" },
      { day: "Søn", type: "Hvile", distance: "—", pace: "Restitusjon", icon: "😴" },
    ],
  },
  {
    week: 21, phase: "Bygging", totalKm: 57,
    sessions: [
      { day: "Man", type: "Lett løping", distance: "10 km", pace: "5:40/km", icon: "🏃" },
      { day: "Tir", type: "Intervall", distance: "12 km", pace: "4:18/km", icon: "🔥" },
      { day: "Ons", type: "Terskelløkt", distance: "12 km", pace: "4:45/km", icon: "⚡" },
      { day: "Tor", type: "Styrke", distance: "45 min", pace: "Bein og hofte", icon: "💪" },
      { day: "Fre", type: "Lett løping", distance: "8 km", pace: "5:45/km", icon: "🏃" },
      { day: "Lør", type: "Langkjøring", distance: "25 km", pace: "5:45/km", icon: "🛣️" },
      { day: "Søn", type: "Hvile", distance: "—", pace: "Restitusjon", icon: "😴" },
    ],
  },
  {
    week: 22, phase: "Bygging", totalKm: 60,
    sessions: [
      { day: "Man", type: "Lett løping", distance: "10 km", pace: "5:40/km", icon: "🏃" },
      { day: "Tir", type: "Terskelløkt", distance: "13 km", pace: "4:45/km", icon: "⚡" },
      { day: "Ons", type: "Styrke", distance: "45 min", pace: "Full kropp", icon: "💪" },
      { day: "Tor", type: "Lett løping", distance: "9 km", pace: "5:45/km", icon: "🏃" },
      { day: "Fre", type: "Hvile", distance: "—", pace: "Restitusjon", icon: "😴" },
      { day: "Lør", type: "Langkjøring", distance: "28 km", pace: "5:45/km", icon: "🛣️" },
      { day: "Søn", type: "Mobilitet", distance: "20 min", pace: "Aktiv hvile", icon: "🧘" },
    ],
  },
  {
    week: 23, phase: "Bygging", totalKm: 62,
    sessions: [
      { day: "Man", type: "Lett løping", distance: "10 km", pace: "5:40/km", icon: "🏃" },
      { day: "Tir", type: "Intervall", distance: "13 km", pace: "4:18/km", icon: "🔥" },
      { day: "Ons", type: "Terskelløkt", distance: "13 km", pace: "4:43/km", icon: "⚡" },
      { day: "Tor", type: "Styrke", distance: "45 min", pace: "Bein og hofte", icon: "💪" },
      { day: "Fre", type: "Lett løping", distance: "9 km", pace: "5:45/km", icon: "🏃" },
      { day: "Lør", type: "Langkjøring", distance: "29 km", pace: "5:43/km", icon: "🛣️" },
      { day: "Søn", type: "Hvile", distance: "—", pace: "Restitusjon", icon: "😴" },
    ],
  },
  {
    week: 24, phase: "Bygging", totalKm: 65,
    sessions: [
      { day: "Man", type: "Lett løping", distance: "11 km", pace: "5:38/km", icon: "🏃" },
      { day: "Tir", type: "Terskelløkt", distance: "14 km", pace: "4:42/km", icon: "⚡" },
      { day: "Ons", type: "Styrke", distance: "45 min", pace: "Full kropp", icon: "💪" },
      { day: "Tor", type: "Lett løping", distance: "10 km", pace: "5:42/km", icon: "🏃" },
      { day: "Fre", type: "Hvile", distance: "—", pace: "Restitusjon", icon: "😴" },
      { day: "Lør", type: "Langkjøring", distance: "30 km", pace: "5:42/km", icon: "🛣️" },
      { day: "Søn", type: "Mobilitet", distance: "20 min", pace: "Aktiv hvile", icon: "🧘" },
    ],
  },
  {
    week: 25, phase: "Bygging", totalKm: 62,
    sessions: [
      { day: "Man", type: "Lett løping", distance: "10 km", pace: "5:40/km", icon: "🏃" },
      { day: "Tir", type: "Intervall", distance: "12 km", pace: "4:18/km", icon: "🔥" },
      { day: "Ons", type: "Terskelløkt", distance: "12 km", pace: "4:43/km", icon: "⚡" },
      { day: "Tor", type: "Styrke", distance: "45 min", pace: "Bein og hofte", icon: "💪" },
      { day: "Fre", type: "Lett løping", distance: "9 km", pace: "5:43/km", icon: "🏃" },
      { day: "Lør", type: "Langkjøring", distance: "29 km", pace: "5:43/km", icon: "🛣️" },
      { day: "Søn", type: "Hvile", distance: "—", pace: "Restitusjon", icon: "😴" },
    ],
  },
  {
    week: 26, phase: "Bygging", totalKm: 60,
    sessions: [
      { day: "Man", type: "Lett løping", distance: "10 km", pace: "5:40/km", icon: "🏃" },
      { day: "Tir", type: "Terskelløkt", distance: "13 km", pace: "4:43/km", icon: "⚡" },
      { day: "Ons", type: "Styrke", distance: "45 min", pace: "Full kropp", icon: "💪" },
      { day: "Tor", type: "Lett løping", distance: "9 km", pace: "5:43/km", icon: "🏃" },
      { day: "Fre", type: "Hvile", distance: "—", pace: "Restitusjon", icon: "😴" },
      { day: "Lør", type: "Langkjøring", distance: "28 km", pace: "5:45/km", icon: "🛣️" },
      { day: "Søn", type: "Mobilitet", distance: "20 min", pace: "Aktiv hvile", icon: "🧘" },
    ],
  },
  // --- Uke 27–36: Bygging (topp) ---
  {
    week: 27, phase: "Bygging", totalKm: 55,
    sessions: [
      { day: "Man", type: "Lett løping", distance: "9 km", pace: "5:40/km", icon: "🏃" },
      { day: "Tir", type: "Terskelløkt", distance: "12 km", pace: "4:43/km", icon: "⚡" },
      { day: "Ons", type: "Styrke", distance: "45 min", pace: "Bein og kjernen", icon: "💪" },
      { day: "Tor", type: "Lett løping", distance: "8 km", pace: "5:45/km", icon: "🏃" },
      { day: "Fre", type: "Hvile", distance: "—", pace: "Restitusjon", icon: "😴" },
      { day: "Lør", type: "Langkjøring", distance: "24 km", pace: "5:45/km", icon: "🛣️" },
      { day: "Søn", type: "Mobilitet", distance: "20 min", pace: "Aktiv hvile", icon: "🧘" },
    ],
  },
  {
    week: 28, phase: "Bygging", totalKm: 58,
    sessions: [
      { day: "Man", type: "Lett løping", distance: "10 km", pace: "5:40/km", icon: "🏃" },
      { day: "Tir", type: "Intervall", distance: "12 km", pace: "4:18/km", icon: "🔥" },
      { day: "Ons", type: "Terskelløkt", distance: "11 km", pace: "4:42/km", icon: "⚡" },
      { day: "Tor", type: "Styrke", distance: "45 min", pace: "Full kropp", icon: "💪" },
      { day: "Fre", type: "Lett løping", distance: "8 km", pace: "5:45/km", icon: "🏃" },
      { day: "Lør", type: "Langkjøring", distance: "27 km", pace: "5:43/km", icon: "🛣️" },
      { day: "Søn", type: "Hvile", distance: "—", pace: "Restitusjon", icon: "😴" },
    ],
  },
  {
    week: 29, phase: "Bygging", totalKm: 62,
    sessions: [
      { day: "Man", type: "Lett løping", distance: "10 km", pace: "5:38/km", icon: "🏃" },
      { day: "Tir", type: "Terskelløkt", distance: "14 km", pace: "4:42/km", icon: "⚡" },
      { day: "Ons", type: "Styrke", distance: "45 min", pace: "Bein og hofte", icon: "💪" },
      { day: "Tor", type: "Lett løping", distance: "9 km", pace: "5:43/km", icon: "🏃" },
      { day: "Fre", type: "Hvile", distance: "—", pace: "Restitusjon", icon: "😴" },
      { day: "Lør", type: "Langkjøring", distance: "29 km", pace: "5:42/km", icon: "🛣️" },
      { day: "Søn", type: "Mobilitet", distance: "20 min", pace: "Dynamisk", icon: "🧘" },
    ],
  },
  {
    week: 30, phase: "Bygging", totalKm: 65,
    sessions: [
      { day: "Man", type: "Lett løping", distance: "11 km", pace: "5:38/km", icon: "🏃" },
      { day: "Tir", type: "Intervall", distance: "13 km", pace: "4:15/km", icon: "🔥" },
      { day: "Ons", type: "Terskelløkt", distance: "13 km", pace: "4:40/km", icon: "⚡" },
      { day: "Tor", type: "Styrke", distance: "45 min", pace: "Full kropp", icon: "💪" },
      { day: "Fre", type: "Lett løping", distance: "9 km", pace: "5:43/km", icon: "🏃" },
      { day: "Lør", type: "Langkjøring", distance: "30 km", pace: "5:40/km", icon: "🛣️" },
      { day: "Søn", type: "Hvile", distance: "—", pace: "Restitusjon", icon: "😴" },
    ],
  },
  {
    week: 31, phase: "Bygging", totalKm: 68,
    sessions: [
      { day: "Man", type: "Lett løping", distance: "11 km", pace: "5:38/km", icon: "🏃" },
      { day: "Tir", type: "Terskelløkt", distance: "14 km", pace: "4:40/km", icon: "⚡" },
      { day: "Ons", type: "Styrke", distance: "45 min", pace: "Bein og hofte", icon: "💪" },
      { day: "Tor", type: "Lett løping", distance: "10 km", pace: "5:42/km", icon: "🏃" },
      { day: "Fre", type: "Hvile", distance: "—", pace: "Restitusjon", icon: "😴" },
      { day: "Lør", type: "Langkjøring", distance: "32 km", pace: "5:40/km", icon: "🛣️" },
      { day: "Søn", type: "Mobilitet", distance: "20 min", pace: "Aktiv hvile", icon: "🧘" },
    ],
  },
  {
    week: 32, phase: "Bygging", totalKm: 44,
    sessions: [
      { day: "Man", type: "Lett løping", distance: "8 km", pace: "5:55/km", icon: "🏃" },
      { day: "Tir", type: "Mobilitet", distance: "25 min", pace: "Aktiv restitusjon", icon: "🧘" },
      { day: "Ons", type: "Lett løping", distance: "9 km", pace: "5:50/km", icon: "🏃" },
      { day: "Tor", type: "Hvile", distance: "—", pace: "Restitusjon", icon: "😴" },
      { day: "Fre", type: "Terskelløkt", distance: "9 km", pace: "4:45/km", icon: "⚡" },
      { day: "Lør", type: "Langkjøring", distance: "18 km", pace: "5:55/km", icon: "🛣️" },
      { day: "Søn", type: "Hvile", distance: "—", pace: "Restitusjon", icon: "😴" },
    ],
  },
  {
    week: 33, phase: "Bygging", totalKm: 67,
    sessions: [
      { day: "Man", type: "Lett løping", distance: "11 km", pace: "5:38/km", icon: "🏃" },
      { day: "Tir", type: "Intervall", distance: "13 km", pace: "4:15/km", icon: "🔥" },
      { day: "Ons", type: "Terskelløkt", distance: "13 km", pace: "4:40/km", icon: "⚡" },
      { day: "Tor", type: "Styrke", distance: "45 min", pace: "Full kropp", icon: "💪" },
      { day: "Fre", type: "Lett løping", distance: "9 km", pace: "5:43/km", icon: "🏃" },
      { day: "Lør", type: "Langkjøring", distance: "31 km", pace: "5:40/km", icon: "🛣️" },
      { day: "Søn", type: "Hvile", distance: "—", pace: "Restitusjon", icon: "😴" },
    ],
  },
  {
    week: 34, phase: "Bygging", totalKm: 70,
    sessions: [
      { day: "Man", type: "Lett løping", distance: "12 km", pace: "5:38/km", icon: "🏃" },
      { day: "Tir", type: "Terskelløkt", distance: "15 km", pace: "4:38/km", icon: "⚡" },
      { day: "Ons", type: "Styrke", distance: "45 min", pace: "Bein og hofte", icon: "💪" },
      { day: "Tor", type: "Lett løping", distance: "10 km", pace: "5:42/km", icon: "🏃" },
      { day: "Fre", type: "Hvile", distance: "—", pace: "Restitusjon", icon: "😴" },
      { day: "Lør", type: "Langkjøring", distance: "32 km", pace: "5:38/km", icon: "🛣️" },
      { day: "Søn", type: "Mobilitet", distance: "20 min", pace: "Aktiv hvile", icon: "🧘" },
    ],
  },
  {
    week: 35, phase: "Bygging", totalKm: 68,
    sessions: [
      { day: "Man", type: "Lett løping", distance: "11 km", pace: "5:40/km", icon: "🏃" },
      { day: "Tir", type: "Intervall", distance: "13 km", pace: "4:13/km", icon: "🔥" },
      { day: "Ons", type: "Terskelløkt", distance: "13 km", pace: "4:38/km", icon: "⚡" },
      { day: "Tor", type: "Styrke", distance: "45 min", pace: "Full kropp", icon: "💪" },
      { day: "Fre", type: "Lett løping", distance: "9 km", pace: "5:43/km", icon: "🏃" },
      { day: "Lør", type: "Langkjøring", distance: "32 km", pace: "5:38/km", icon: "🛣️" },
      { day: "Søn", type: "Hvile", distance: "—", pace: "Restitusjon", icon: "😴" },
    ],
  },
  {
    week: 36, phase: "Bygging", totalKm: 62,
    sessions: [
      { day: "Man", type: "Lett løping", distance: "10 km", pace: "5:40/km", icon: "🏃" },
      { day: "Tir", type: "Terskelløkt", distance: "14 km", pace: "4:40/km", icon: "⚡" },
      { day: "Ons", type: "Styrke", distance: "45 min", pace: "Bein og kjernen", icon: "💪" },
      { day: "Tor", type: "Lett løping", distance: "9 km", pace: "5:43/km", icon: "🏃" },
      { day: "Fre", type: "Hvile", distance: "—", pace: "Restitusjon", icon: "😴" },
      { day: "Lør", type: "Langkjøring", distance: "29 km", pace: "5:42/km", icon: "🛣️" },
      { day: "Søn", type: "Mobilitet", distance: "20 min", pace: "Aktiv hvile", icon: "🧘" },
    ],
  },
  // --- Uke 37–48: Topp ---
  {
    week: 37, phase: "Topp", totalKm: 64,
    sessions: [
      { day: "Man", type: "Lett løping", distance: "10 km", pace: "5:40/km", icon: "🏃" },
      { day: "Tir", type: "Intervall", distance: "13 km", pace: "4:12/km", icon: "🔥" },
      { day: "Ons", type: "Terskelløkt", distance: "13 km", pace: "4:38/km", icon: "⚡" },
      { day: "Tor", type: "Styrke", distance: "45 min", pace: "Bein og hofte", icon: "💪" },
      { day: "Fre", type: "Lett løping", distance: "9 km", pace: "5:43/km", icon: "🏃" },
      { day: "Lør", type: "Langkjøring", distance: "30 km", pace: "5:10/km (MP)", icon: "🛣️" },
      { day: "Søn", type: "Hvile", distance: "—", pace: "Restitusjon", icon: "😴" },
    ],
  },
  {
    week: 38, phase: "Topp", totalKm: 66,
    sessions: [
      { day: "Man", type: "Lett løping", distance: "11 km", pace: "5:38/km", icon: "🏃" },
      { day: "Tir", type: "Terskelløkt", distance: "14 km", pace: "4:38/km", icon: "⚡" },
      { day: "Ons", type: "Styrke", distance: "45 min", pace: "Full kropp", icon: "💪" },
      { day: "Tor", type: "Lett løping", distance: "10 km", pace: "5:42/km", icon: "🏃" },
      { day: "Fre", type: "Hvile", distance: "—", pace: "Restitusjon", icon: "😴" },
      { day: "Lør", type: "Langkjøring", distance: "32 km", pace: "5:10/km (MP)", icon: "🛣️" },
      { day: "Søn", type: "Mobilitet", distance: "20 min", pace: "Aktiv hvile", icon: "🧘" },
    ],
  },
  {
    week: 39, phase: "Topp", totalKm: 68,
    sessions: [
      { day: "Man", type: "Lett løping", distance: "11 km", pace: "5:38/km", icon: "🏃" },
      { day: "Tir", type: "Intervall", distance: "13 km", pace: "4:10/km", icon: "🔥" },
      { day: "Ons", type: "Terskelløkt", distance: "14 km", pace: "4:37/km", icon: "⚡" },
      { day: "Tor", type: "Styrke", distance: "45 min", pace: "Bein og hofte", icon: "💪" },
      { day: "Fre", type: "Lett løping", distance: "10 km", pace: "5:42/km", icon: "🏃" },
      { day: "Lør", type: "Langkjøring", distance: "33 km", pace: "5:08/km (MP)", icon: "🛣️" },
      { day: "Søn", type: "Hvile", distance: "—", pace: "Restitusjon", icon: "😴" },
    ],
  },
  {
    week: 40, phase: "Topp", totalKm: 46,
    sessions: [
      { day: "Man", type: "Lett løping", distance: "8 km", pace: "5:50/km", icon: "🏃" },
      { day: "Tir", type: "Mobilitet", distance: "25 min", pace: "Aktiv restitusjon", icon: "🧘" },
      { day: "Ons", type: "Lett løping", distance: "9 km", pace: "5:50/km", icon: "🏃" },
      { day: "Tor", type: "Hvile", distance: "—", pace: "Restitusjon", icon: "😴" },
      { day: "Fre", type: "Terskelløkt", distance: "9 km", pace: "4:40/km", icon: "⚡" },
      { day: "Lør", type: "Langkjøring", distance: "20 km", pace: "5:45/km", icon: "🛣️" },
      { day: "Søn", type: "Hvile", distance: "—", pace: "Restitusjon", icon: "😴" },
    ],
  },
  {
    week: 41, phase: "Topp", totalKm: 66,
    sessions: [
      { day: "Man", type: "Lett løping", distance: "11 km", pace: "5:38/km", icon: "🏃" },
      { day: "Tir", type: "Terskelløkt", distance: "14 km", pace: "4:37/km", icon: "⚡" },
      { day: "Ons", type: "Styrke", distance: "45 min", pace: "Full kropp", icon: "💪" },
      { day: "Tor", type: "Lett løping", distance: "10 km", pace: "5:42/km", icon: "🏃" },
      { day: "Fre", type: "Hvile", distance: "—", pace: "Restitusjon", icon: "😴" },
      { day: "Lør", type: "Langkjøring", distance: "32 km", pace: "5:08/km (MP)", icon: "🛣️" },
      { day: "Søn", type: "Mobilitet", distance: "20 min", pace: "Aktiv hvile", icon: "🧘" },
    ],
  },
  {
    week: 42, phase: "Topp", totalKm: 68,
    sessions: [
      { day: "Man", type: "Lett løping", distance: "11 km", pace: "5:38/km", icon: "🏃" },
      { day: "Tir", type: "Intervall", distance: "13 km", pace: "4:10/km", icon: "🔥" },
      { day: "Ons", type: "Terskelløkt", distance: "14 km", pace: "4:37/km", icon: "⚡" },
      { day: "Tor", type: "Styrke", distance: "45 min", pace: "Bein og hofte", icon: "💪" },
      { day: "Fre", type: "Lett løping", distance: "10 km", pace: "5:42/km", icon: "🏃" },
      { day: "Lør", type: "Langkjøring", distance: "33 km", pace: "5:08/km (MP)", icon: "🛣️" },
      { day: "Søn", type: "Hvile", distance: "—", pace: "Restitusjon", icon: "😴" },
    ],
  },
  {
    week: 43, phase: "Topp", totalKm: 66,
    sessions: [
      { day: "Man", type: "Lett løping", distance: "11 km", pace: "5:38/km", icon: "🏃" },
      { day: "Tir", type: "Terskelløkt", distance: "14 km", pace: "4:37/km", icon: "⚡" },
      { day: "Ons", type: "Styrke", distance: "45 min", pace: "Full kropp", icon: "💪" },
      { day: "Tor", type: "Lett løping", distance: "9 km", pace: "5:42/km", icon: "🏃" },
      { day: "Fre", type: "Hvile", distance: "—", pace: "Restitusjon", icon: "😴" },
      { day: "Lør", type: "Langkjøring", distance: "35 km", pace: "5:10/km (MP)", icon: "🛣️" },
      { day: "Søn", type: "Mobilitet", distance: "20 min", pace: "Aktiv hvile", icon: "🧘" },
    ],
  },
  {
    week: 44, phase: "Topp", totalKm: 46,
    sessions: [
      { day: "Man", type: "Lett løping", distance: "8 km", pace: "5:50/km", icon: "🏃" },
      { day: "Tir", type: "Mobilitet", distance: "25 min", pace: "Aktiv restitusjon", icon: "🧘" },
      { day: "Ons", type: "Lett løping", distance: "9 km", pace: "5:50/km", icon: "🏃" },
      { day: "Tor", type: "Hvile", distance: "—", pace: "Restitusjon", icon: "😴" },
      { day: "Fre", type: "Terskelløkt", distance: "9 km", pace: "4:40/km", icon: "⚡" },
      { day: "Lør", type: "Langkjøring", distance: "20 km", pace: "5:45/km", icon: "🛣️" },
      { day: "Søn", type: "Hvile", distance: "—", pace: "Restitusjon", icon: "😴" },
    ],
  },
  {
    week: 45, phase: "Topp", totalKm: 65,
    sessions: [
      { day: "Man", type: "Lett løping", distance: "11 km", pace: "5:38/km", icon: "🏃" },
      { day: "Tir", type: "Intervall", distance: "13 km", pace: "4:10/km", icon: "🔥" },
      { day: "Ons", type: "Terskelløkt", distance: "13 km", pace: "4:37/km", icon: "⚡" },
      { day: "Tor", type: "Styrke", distance: "45 min", pace: "Bein og hofte", icon: "💪" },
      { day: "Fre", type: "Lett løping", distance: "9 km", pace: "5:42/km", icon: "🏃" },
      { day: "Lør", type: "Langkjøring", distance: "32 km", pace: "5:08/km (MP)", icon: "🛣️" },
      { day: "Søn", type: "Hvile", distance: "—", pace: "Restitusjon", icon: "😴" },
    ],
  },
  {
    week: 46, phase: "Topp", totalKm: 63,
    sessions: [
      { day: "Man", type: "Lett løping", distance: "10 km", pace: "5:40/km", icon: "🏃" },
      { day: "Tir", type: "Terskelløkt", distance: "14 km", pace: "4:37/km", icon: "⚡" },
      { day: "Ons", type: "Styrke", distance: "45 min", pace: "Full kropp", icon: "💪" },
      { day: "Tor", type: "Lett løping", distance: "9 km", pace: "5:42/km", icon: "🏃" },
      { day: "Fre", type: "Hvile", distance: "—", pace: "Restitusjon", icon: "😴" },
      { day: "Lør", type: "Langkjøring", distance: "30 km", pace: "5:10/km (MP)", icon: "🛣️" },
      { day: "Søn", type: "Mobilitet", distance: "20 min", pace: "Aktiv hvile", icon: "🧘" },
    ],
  },
  {
    week: 47, phase: "Topp", totalKm: 60,
    sessions: [
      { day: "Man", type: "Lett løping", distance: "10 km", pace: "5:40/km", icon: "🏃" },
      { day: "Tir", type: "Intervall", distance: "12 km", pace: "4:12/km", icon: "🔥" },
      { day: "Ons", type: "Terskelløkt", distance: "12 km", pace: "4:38/km", icon: "⚡" },
      { day: "Tor", type: "Styrke", distance: "40 min", pace: "Bein og hofte", icon: "💪" },
      { day: "Fre", type: "Lett løping", distance: "9 km", pace: "5:43/km", icon: "🏃" },
      { day: "Lør", type: "Langkjøring", distance: "29 km", pace: "5:10/km (MP)", icon: "🛣️" },
      { day: "Søn", type: "Hvile", distance: "—", pace: "Restitusjon", icon: "😴" },
    ],
  },
  {
    week: 48, phase: "Topp", totalKm: 56,
    sessions: [
      { day: "Man", type: "Lett løping", distance: "9 km", pace: "5:42/km", icon: "🏃" },
      { day: "Tir", type: "Terskelløkt", distance: "13 km", pace: "4:38/km", icon: "⚡" },
      { day: "Ons", type: "Styrke", distance: "40 min", pace: "Full kropp", icon: "💪" },
      { day: "Tor", type: "Lett løping", distance: "8 km", pace: "5:45/km", icon: "🏃" },
      { day: "Fre", type: "Hvile", distance: "—", pace: "Restitusjon", icon: "😴" },
      { day: "Lør", type: "Langkjøring", distance: "26 km", pace: "5:12/km (MP)", icon: "🛣️" },
      { day: "Søn", type: "Mobilitet", distance: "20 min", pace: "Aktiv hvile", icon: "🧘" },
    ],
  },
  // --- Uke 49–52: Nedtrapping ---
  {
    week: 49, phase: "Nedtrapping", totalKm: 52,
    sessions: [
      { day: "Man", type: "Lett løping", distance: "9 km", pace: "5:45/km", icon: "🏃" },
      { day: "Tir", type: "Terskelløkt", distance: "11 km", pace: "4:40/km", icon: "⚡" },
      { day: "Ons", type: "Styrke", distance: "35 min", pace: "Lett", icon: "💪" },
      { day: "Tor", type: "Lett løping", distance: "8 km", pace: "5:50/km", icon: "🏃" },
      { day: "Fre", type: "Hvile", distance: "—", pace: "Restitusjon", icon: "😴" },
      { day: "Lør", type: "Langkjøring", distance: "24 km", pace: "5:15/km (MP)", icon: "🛣️" },
      { day: "Søn", type: "Mobilitet", distance: "20 min", pace: "Aktiv hvile", icon: "🧘" },
    ],
  },
  {
    week: 50, phase: "Nedtrapping", totalKm: 42,
    sessions: [
      { day: "Man", type: "Lett løping", distance: "8 km", pace: "5:48/km", icon: "🏃" },
      { day: "Tir", type: "Terskelløkt", distance: "9 km", pace: "4:42/km", icon: "⚡" },
      { day: "Ons", type: "Mobilitet", distance: "25 min", pace: "Aktiv restitusjon", icon: "🧘" },
      { day: "Tor", type: "Hvile", distance: "—", pace: "Restitusjon", icon: "😴" },
      { day: "Fre", type: "Lett løping", distance: "7 km", pace: "5:52/km", icon: "🏃" },
      { day: "Lør", type: "Langkjøring", distance: "18 km", pace: "5:20/km (MP)", icon: "🛣️" },
      { day: "Søn", type: "Hvile", distance: "—", pace: "Restitusjon", icon: "😴" },
    ],
  },
  {
    week: 51, phase: "Nedtrapping", totalKm: 32,
    sessions: [
      { day: "Man", type: "Lett løping", distance: "7 km", pace: "5:50/km", icon: "🏃" },
      { day: "Tir", type: "Terskelløkt", distance: "7 km", pace: "4:45/km", icon: "⚡" },
      { day: "Ons", type: "Mobilitet", distance: "20 min", pace: "Lett", icon: "🧘" },
      { day: "Tor", type: "Hvile", distance: "—", pace: "Restitusjon", icon: "😴" },
      { day: "Fre", type: "Lett løping", distance: "5 km", pace: "5:55/km", icon: "🏃" },
      { day: "Lør", type: "Langkjøring", distance: "13 km", pace: "5:30/km (MP)", icon: "🛣️" },
      { day: "Søn", type: "Hvile", distance: "—", pace: "Restitusjon", icon: "😴" },
    ],
  },
  {
    week: 52, phase: "Nedtrapping", totalKm: 30,
    sessions: [
      { day: "Man", type: "Lett løping", distance: "6 km", pace: "5:55/km", icon: "🏃" },
      { day: "Tir", type: "Lett løping", distance: "5 km", pace: "6:00/km", icon: "🏃" },
      { day: "Ons", type: "Mobilitet", distance: "20 min", pace: "Lett", icon: "🧘" },
      { day: "Tor", type: "Hvile", distance: "—", pace: "Restitusjon", icon: "😴" },
      { day: "Fre", type: "Lett løping", distance: "4 km", pace: "6:00/km", icon: "🏃" },
      { day: "Lør", type: "Hvile", distance: "—", pace: "Forberedelse", icon: "😴" },
      { day: "Søn", type: "LØP!", distance: "42,2 km", pace: "Målfart!", icon: "🏅" },
    ],
  },
];
