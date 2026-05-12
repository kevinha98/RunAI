/**
 * Shared training plan data â€” used by the plan page and the AI coach tools.
 * Program: Halvmaraton sub 2:00, Bergen City Marathon.
 * Plan start: Monday 5 May 2026 (week 1).
 * Race: 24 April 2027.
 *
 * Session types:
 *  "Rolig jogg"  â€” easy run    (pace: P5k + 90 sek/km)
 *  "Styrke"      â€” strength
 *  "Terskel"     â€” threshold   (pace: P5k + 20 sek/km)
 *  "Intervall"   â€” intervals   (pace: P5k âˆ’ 10 sek/km)
 *  "Langtur"     â€” long run    (pace: P5k + 75 sek/km)
 *  "Hvile"       â€” rest
 *
 * For Terskel/Intervall sessions `distance` holds the interval format
 * ("5Ã—1000 m", "4Ã—8 min") â€” NOT kilometres.
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

/** Returns the current plan week number (1-based), clamped to 1â€“TOTAL_WEEKS. */
export function getCurrentWeek(): number {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const elapsed = Date.now() - PLAN_START.getTime();
  return Math.min(TOTAL_WEEKS, Math.max(1, Math.floor(elapsed / msPerWeek) + 1));
}

export const SESSION_ICONS: Record<string, string> = {
  "Rolig jogg": "ðŸƒ",
  Styrke:       "ðŸ’ª",
  Terskel:      "âš¡",
  Intervall:    "ðŸ”¥",
  Langtur:      "ðŸ›£ï¸",
  Hvile:        "ðŸ˜´",
};

/**
 * Returns an interval badge string when the distance field already contains
 * interval notation (e.g. "5Ã—1000 m" or "3Ã—10 min").
 */
export function getIntervalLabel(type: string, distStr: string): string | undefined {
  if (type !== "Terskel" && type !== "Intervall") return undefined;
  if (!distStr || distStr === "â€”") return undefined;
  // distStr IS the interval format â€” return it as the badge label
  if (distStr.includes("Ã—") || /\d+\s*min/.test(distStr)) return distStr;
  return undefined;
}

// ─── Halvmaraton-program (programmatisk generert) ───────────────────────────

function getPhase(w: number): Phase {
  if (w <= 12) return "Grunntrening";
  if (w <= 24) return "Bygging";
  if (w <= 42) return "Topp";
  return "Nedtrapping";
}

function buildWeeks(): Week[] {
  // Terskel-format per fase (indeks = uke-i-fase 0-basert)
  const TERSKEL: Record<Phase, string[]> = {
    Grunntrening: [
      "4×8 min","5×8 min","3×10 min","4×6 min",   // uke 1–4
      "5×8 min","3×10 min","4×10 min","3×8 min",   // uke 5–8
      "3×12 min","4×10 min","4×12 min","4×6 min",  // uke 9–12
    ],
    Bygging: [
      "2×20 min","25 min","2×20 min","2×15 min",   // uke 13–16
      "30 min","2×20 min","35 min","2×15 min",     // uke 17–20
      "40 min","35 min","40 min","2×15 min",       // uke 21–24
    ],
    Topp: [
      "40 min","3×15 min","45 min","2×15 min",     // uke 25–28
      "45 min","3×15 min","50 min","2×15 min",     // uke 29–32
      "50 min","3×15 min","45 min","2×15 min",     // uke 33–36
      "40 min","3×12 min","35 min","2×12 min",     // uke 37–40
      "30 min","3×10 min",                          // uke 41–42
    ],
    Nedtrapping: [
      "3×10 min","25 min","3×8 min","20 min",      // uke 43–46
      "2×10 min","15 min","10 min","2×8 min",      // uke 47–50
      "10 min","—",                                 // uke 51–52
    ],
  };

  // Intervall-format: [normal, lett]
  const INTERVALL: Record<Phase, [string, string]> = {
    Grunntrening: ["5×1000 m", "4×1000 m"],
    Bygging:      ["6×1000 m", "5×1000 m"],
    Topp:         ["6×1000 m", "5×1000 m"],
    Nedtrapping:  ["4×1000 m", "3×1000 m"],
  };

  // Langtur km per fase (indeks = uke-i-fase 0-basert)
  const LANGTUR: Record<Phase, number[]> = {
    Grunntrening: [10, 11, 12, 10, 13, 14, 15, 11, 15, 16, 16, 12],
    Bygging:      [16, 17, 17, 13, 18, 18, 19, 14, 19, 20, 20, 15],
    Topp:         [20, 20, 21, 15, 21, 21, 22, 15, 22, 20, 19, 15, 21, 19, 18, 14, 16, 14],
    Nedtrapping:  [16, 14, 12, 10, 10, 8, 8, 6, 5, 0],
  };

  // Styrke-varighet: [normal, lett]
  const STYRKE: Record<Phase, [string, string]> = {
    Grunntrening: ["35 min", "30 min"],
    Bygging:      ["40 min", "30 min"],
    Topp:         ["40 min", "25 min"],
    Nedtrapping:  ["25 min", "20 min"],
  };

  // Rolig km per fase
  const ROLIG: Record<Phase, number> = {
    Grunntrening: 5, Bygging: 6, Topp: 7, Nedtrapping: 4,
  };

  // Terskel-session total km (inkl. innkjøring/nedkjøring) for totalKm-estimat
  const TERSKEL_KM: Record<Phase, number> = {
    Grunntrening: 9, Bygging: 11, Topp: 13, Nedtrapping: 7,
  };
  const INTERVALL_KM: Record<Phase, number> = {
    Grunntrening: 9, Bygging: 11, Topp: 11, Nedtrapping: 7,
  };

  const phaseStart: Record<Phase, number> = {
    Grunntrening: 1, Bygging: 13, Topp: 25, Nedtrapping: 43,
  };

  const weeks: Week[] = [];

  for (let w = 1; w <= TOTAL_WEEKS; w++) {
    const phase = getPhase(w);
    const isLett = w % 4 === 0;
    const wip = w - phaseStart[phase]; // 0-basert uke i fasen

    const terskelArr = TERSKEL[phase];
    const terskelFmt = terskelArr[Math.min(wip, terskelArr.length - 1)];

    const [intervNormal, intervLett] = INTERVALL[phase];
    const intervallFmt = isLett ? intervLett : intervNormal;

    const langturArr = LANGTUR[phase];
    const langturKm = langturArr[Math.min(wip, langturArr.length - 1)];

    const roligKm = ROLIG[phase];
    const [styrkeNormal, styrkeLett] = STYRKE[phase];
    const styrkeFmt = isLett ? styrkeLett : styrkeNormal;

    const totalKm = roligKm + TERSKEL_KM[phase] + INTERVALL_KM[phase] + langturKm;

    // Siste uke = løpet
    if (w === TOTAL_WEEKS) {
      weeks.push({
        week: w,
        phase: "Nedtrapping",
        totalKm: 21,
        sessions: [
          { day: "Man", type: "Rolig jogg", distance: "3 km", pace: "6:30/km", icon: "🏃" },
          { day: "Ons", type: "Rolig jogg", distance: "2 km", pace: "6:30/km", icon: "🏃" },
          { day: "Søn", type: "Langtur",    distance: "21 km", pace: "Målfart! 🏅", icon: "🏅" },
        ],
      });
      continue;
    }

    const sessions: Session[] = [
      { day: "Man", type: "Rolig jogg", distance: `${roligKm} km`, pace: "6:30/km", icon: "🏃" },
      { day: "Tir", type: "Styrke", distance: styrkeFmt, pace: "Bein, kjerne, overkropp", icon: "💪" },
    ];

    if (terskelFmt && terskelFmt !== "—") {
      sessions.push({ day: "Ons", type: "Terskel", distance: terskelFmt, pace: "5:20/km", icon: "⚡" });
    }

    if (intervallFmt && intervallFmt !== "—") {
      sessions.push({ day: "Fre", type: "Intervall", distance: intervallFmt, pace: "4:50/km", icon: "🔥" });
    }

    if (langturKm > 0) {
      sessions.push({ day: "Søn", type: "Langtur", distance: `${langturKm} km`, pace: "6:15/km", icon: "🛣️" });
    }

    weeks.push({ week: w, phase, totalKm, sessions });
  }

  return weeks;
}

export const WEEKS: Week[] = buildWeeks();