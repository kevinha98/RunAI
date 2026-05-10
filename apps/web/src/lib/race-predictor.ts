// race-predictor.ts — Pure race time prediction engine (no imports, no side effects)
// Sources: Riegel (1981), Vickers & Vertosick (2016), Daniels Running Formula, Dave Cameron

export const DIST = { FIVE_K: 5000, TEN_K: 10000, HALF_MARATHON: 21097, MARATHON: 42195 } as const;

export interface TrainingPaces {
  easy: [number, number];
  marathon: number;
  threshold: number;
  interval: number;
  repetition: number;
}

export interface PredictorInput {
  fiveK?: number;
  tenK?: number;
  targetDist: number;
}

export interface PredictorResult {
  primary: number;
  optimistic: number;
  conservative: number;
  method: string;
  k?: number;
  vdot?: number;
  paces?: TrainingPaces;
  warnings: string[];
}

function cameronF(x: number): number {
  return 13.49681 - 0.000030363 * x + 835.7114 / (x ** 0.7905);
}

export function cameronPredict(knownTime: number, knownDist: number, targetDist: number): number {
  if (knownDist === targetDist) return knownTime;
  return knownTime * (targetDist / knownDist) * (cameronF(knownDist) / cameronF(targetDist));
}

export function riegelPredict(knownTime: number, knownDist: number, targetDist: number, k = 1.06): number {
  if (knownDist === targetDist) return knownTime;
  return knownTime * (targetDist / knownDist) ** k;
}

export function personalKPredict(time1: number, dist1: number, time2: number, dist2: number, targetDist: number): { time: number; k: number } {
  const k = Math.log(time2 / time1) / Math.log(dist2 / dist1);
  return { time: time1 * (targetDist / dist1) ** k, k };
}

function pctVo2max(t: number): number {
  return 0.8 + 0.1894393 * Math.exp(-0.012778 * t) + 0.2989558 * Math.exp(-0.1932605 * t);
}

function vo2AtVelocity(v: number): number {
  return -4.60 + 0.182258 * v + 0.000104 * v * v;
}

export function vdot(raceTime: number, distanceMeters: number): number {
  const t = raceTime / 60;
  const v = distanceMeters / t;
  return vo2AtVelocity(v) / pctVo2max(t);
}

export function predictFromVdot(vdotScore: number, targetDist: number): number {
  let lo = 60, hi = 8 * 3600;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (vdot(mid, targetDist) > vdotScore) lo = mid; else hi = mid;
    if (hi - lo < 0.1) break;
  }
  return (lo + hi) / 2;
}

export function trainingPaces(vdotScore: number): TrainingPaces {
  let lo = 100, hi = 600;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (vo2AtVelocity(mid) < vdotScore) lo = mid; else hi = mid;
  }
  const vVo2max = (lo + hi) / 2;
  const secPerKm = (v: number) => (1000 / v) * 60;
  return {
    // easy: [slow end (59% vVO2max), fast end (74% vVO2max)]
    easy: [secPerKm(vVo2max * 0.59), secPerKm(vVo2max * 0.74)],
    marathon: secPerKm(vVo2max * 0.80),
    threshold: secPerKm(vVo2max * 0.88),
    interval: secPerKm(vVo2max * 0.98),
    repetition: secPerKm(vVo2max * 1.10),
  };
}

export function predict(input: PredictorInput): PredictorResult {
  const { fiveK, tenK, targetDist } = input;
  const warnings: string[] = [];
  let primary: number, method: string, k: number | undefined;

  if (!fiveK && !tenK) throw new Error("Minst én løpstid må oppgis.");

  // Sanity bounds: 5K 10:00–60:00, 10K 20:00–120:00
  if (fiveK !== undefined && (fiveK < 600 || fiveK > 3600))
    throw new Error(`5K-tid (${formatTime(fiveK)}) virker urimelig — forventet 10:00–60:00.`);
  if (tenK !== undefined && (tenK < 1200 || tenK > 7200))
    throw new Error(`10K-tid (${formatTime(tenK)}) virker urimelig — forventet 20:00–2:00:00.`);
  if (fiveK && tenK && tenK <= fiveK)
    throw new Error("10K-tid må være større enn 5K-tid.");

  if (fiveK && tenK) {
    const r = personalKPredict(fiveK, DIST.FIVE_K, tenK, DIST.TEN_K, targetDist);
    primary = r.time; k = r.k;
    method = "Personlig k-faktor (Vickers & Vertosick 2016)";
    if (k < 1.00 || k > 1.25) warnings.push("k-faktoren er utenfor normalt område (1.00–1.25). En av tidene kan ha vært en dårlig dag.");
    if (k > 1.12) warnings.push("Din personlige k-faktor antyder at du taper tempo mer enn gjennomsnittet. Fokuser på utholdenhetstrening.");
    const cam = cameronPredict(fiveK, DIST.FIVE_K, targetDist);
    if (Math.abs(primary - cam) > 180) warnings.push(`Cameron-formelen gir ${formatTime(Math.round(cam))}, personlig k gir ${formatTime(Math.round(primary))}. Sjekk om en av tidene er fra en dårlig dag.`);
  } else {
    const knownTime = fiveK ?? tenK!;
    const knownDist = fiveK ? DIST.FIVE_K : DIST.TEN_K;
    primary = cameronPredict(knownTime, knownDist, targetDist);
    method = "Cameron-formel";
    const rie = riegelPredict(knownTime, knownDist, targetDist);
    if (Math.abs(primary - rie) > 180) warnings.push(`Cameron gir ${formatTime(Math.round(primary))}, Riegel gir ${formatTime(Math.round(rie))}. Avviket er uvanlig.`);
  }

  if (targetDist === DIST.MARATHON) warnings.push("Nøyaktigheten er lavere for maraton — opp til ±10 min avvik er vanlig.");

  // Prefer 10K for VDOT (longer race = more reliable VO2max estimate)
  const vdotTime = tenK ?? fiveK!;
  const vdotDist = tenK ? DIST.TEN_K : DIST.FIVE_K;
  const v = vdot(vdotTime, vdotDist);
  return {
    primary: Math.round(primary), optimistic: Math.round(primary * 0.98), conservative: Math.round(primary * 1.03),
    method, k, vdot: Math.round(v * 10) / 10, paces: trainingPaces(v), warnings,
  };
}

export function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600), m = Math.floor((totalSeconds % 3600) / 60), s = totalSeconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatPaceMin(secsPerKm: number): string {
  let m = Math.floor(secsPerKm / 60), s = Math.round(secsPerKm % 60);
  if (s === 60) { m += 1; s = 0; }
  return `${m}:${String(s).padStart(2, "0")} /km`;
}

export function parseTime(str: string): number {
  const parts = str.trim().split(":").map(Number);
  if (parts.some(isNaN)) throw new Error(`Ugyldig tid: ${str}`);
  if (parts.length === 2) {
    const [m, s] = parts;
    if (s >= 60) throw new Error(`Sekunder må være 0–59 (fikk ${s})`);
    if (m < 0) throw new Error("Minutter kan ikke være negative");
    return m * 60 + s;
  }
  if (parts.length === 3) {
    const [h, m, s] = parts;
    if (s >= 60) throw new Error(`Sekunder må være 0–59 (fikk ${s})`);
    if (m >= 60) throw new Error(`Minutter må være 0–59 (fikk ${m})`);
    if (h < 0) throw new Error("Timer kan ikke være negative");
    return h * 3600 + m * 60 + s;
  }
  throw new Error(`Ugyldig format: bruk mm:ss eller h:mm:ss`);
}