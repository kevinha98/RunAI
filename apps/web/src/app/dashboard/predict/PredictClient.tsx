"use client";

import { useState, useCallback } from "react";
import { ChevronDown, ChevronUp, Info, TrendingUp } from "lucide-react";
import {
  predict,
  formatTime,
  formatPaceMin,
  parseTime,
  DIST,
  type PredictorResult,
} from "@/lib/race-predictor";

function TimeInput({
  label, hint, value, onChange, onValidChange, testId,
}: { label: string; hint: string; value: string; onChange: (v: string) => void; onValidChange?: (v: boolean) => void; testId: string }) {
  const [error, setError] = useState<string | null>(null);
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    onChange(v);
    if (!v) { setError(null); onValidChange?.(true); return; }
    try {
      const s = parseTime(v);
      if (s <= 0) { setError("Tid må være større enn 0"); onValidChange?.(false); }
      else { setError(null); onValidChange?.(true); }
    } catch (err) { setError(err instanceof Error ? err.message : "Ugyldig format"); onValidChange?.(false); }
  }
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-[#111110]">{label}</label>
      <p className="text-xs text-[#9B9B95]">{hint}</p>
      <input data-testid={testId} type="text" placeholder="mm:ss" value={value} onChange={handleChange}
        className="mt-1 w-full px-3 py-2 border border-[#E5E5E2] rounded-lg text-[#111110] placeholder-[#C0C0B8] focus:outline-none focus:ring-2 focus:ring-[#FC5200] focus:border-transparent text-sm" />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

function RangeBar({ optimistic, primary, conservative }: { optimistic: number; primary: number; conservative: number }) {
  const span = conservative - optimistic;
  const pct = span > 0 ? ((primary - optimistic) / span) * 100 : 50;
  return (
    <div className="mt-4">
      <div className="flex justify-between text-xs text-[#6B6B65] mb-1">
        <span>Optimistisk {formatTime(optimistic)}</span>
        <span>Konservativt {formatTime(conservative)}</span>
      </div>
      <div className="relative h-2 bg-[#E5E5E2] rounded-full">
        <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-orange-400 rounded-full" />
        <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-[#FC5200] rounded-full shadow"
          style={{ left: `calc(${pct}% - 6px)` }} />
      </div>
    </div>
  );
}

export default function PredictClient() {
  const [fiveKStr, setFiveKStr] = useState("");
  const [tenKStr, setTenKStr] = useState("");
  const [fiveKValid, setFiveKValid] = useState(true);
  const [tenKValid, setTenKValid] = useState(true);
  const [results, setResults] = useState<{ halfMarathon: PredictorResult; tenKPred?: PredictorResult; marathon: PredictorResult } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPaces, setShowPaces] = useState(false);
  const [showScience, setShowScience] = useState(false);

  const canSubmit = (fiveKStr.trim() !== "" || tenKStr.trim() !== "") && fiveKValid && tenKValid;

  const handlePredict = useCallback(() => {
    setError(null); setResults(null);
    try {
      const fiveK = fiveKStr.trim() ? parseTime(fiveKStr.trim()) : undefined;
      const tenK = tenKStr.trim() ? parseTime(tenKStr.trim()) : undefined;
      if (fiveK !== undefined && fiveK <= 0) throw new Error("5K-tid må være > 0");
      if (tenK !== undefined && tenK <= 0) throw new Error("10K-tid må være > 0");
      const halfMarathon = predict({ fiveK, tenK, targetDist: DIST.HALF_MARATHON });
      const marathon = predict({ fiveK, tenK, targetDist: DIST.MARATHON });
      const tenKPred = fiveKStr.trim() && !tenKStr.trim() ? predict({ fiveK, tenK, targetDist: DIST.TEN_K }) : undefined;
      setResults({ halfMarathon, tenKPred, marathon });
    } catch (e) { setError(e instanceof Error ? e.message : "Noe gikk galt"); }
  }, [fiveKStr, tenKStr]);

  return (
    <div className="space-y-6">
      {/* Input */}
      <div className="bg-white border border-[#E5E5E2] rounded-xl p-6">
        <h2 className="text-base font-semibold text-[#111110] mb-1">Dine løpsresultater</h2>
        <p className="text-xs text-[#9B9B95] mb-5">Fyll inn én eller begge. Format: <code className="bg-[#F5F5F3] px-1 rounded">mm:ss</code> eller <code className="bg-[#F5F5F3] px-1 rounded">h:mm:ss</code></p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <TimeInput label="5K personlig beste" hint="F.eks. 22:14 (mm:ss)" value={fiveKStr} onChange={setFiveKStr} onValidChange={setFiveKValid} testId="input-5k" />
          <TimeInput label="10K personlig beste" hint="F.eks. 45:30 (mm:ss)" value={tenKStr} onChange={setTenKStr} onValidChange={setTenKValid} testId="input-10k" />
        </div>
        {tenKStr.trim() && fiveKStr.trim() && (
          <p className="mt-4 text-xs text-green-600">✓ Begge tider gitt — bruker personlig k-faktor for høyest nøyaktighet</p>
        )}
        {error && <p className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        <button onClick={handlePredict} disabled={!canSubmit} data-testid="btn-predict"
          className="mt-5 px-5 py-2.5 bg-[#FC5200] text-white font-semibold rounded-lg text-sm hover:bg-[#E04800] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          Beregn tid
        </button>
      </div>

      {results && (
        <>
          {/* Warnings */}
          {results.halfMarathon.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
              <span className="mt-0.5 shrink-0">⚠️</span><span>{w}</span>
            </div>
          ))}

          {/* Main HM result */}
          <div data-testid="result-halfmarathon" className="rounded-xl border border-[#FC5200] bg-orange-50 p-5">
            <p className="text-xs font-medium text-[#6B6B65] uppercase tracking-wide mb-1">Halvmaraton — 21,1 km</p>
            <p className="text-4xl font-bold tabular-nums text-[#FC5200]">{formatTime(results.halfMarathon.primary)}</p>
            <p className="text-xs text-[#9B9B95] mt-1">{results.halfMarathon.method}</p>
            <RangeBar optimistic={results.halfMarathon.optimistic} primary={results.halfMarathon.primary} conservative={results.halfMarathon.conservative} />
          </div>

          {/* Personal k */}
          {results.halfMarathon.k !== undefined && (
            <div className="flex items-start gap-3 bg-[#F5F5F3] border border-[#E5E5E2] rounded-xl px-5 py-4 text-sm text-[#6B6B65]">
              <Info className="w-4 h-4 mt-0.5 shrink-0 text-[#FC5200]" />
              <span>
                <strong className="text-[#111110]">Personlig k-faktor: {results.halfMarathon.k.toFixed(3)}</strong>
                {" "}— mål på utholdenhet over distanser. Snitt for mosjonister: 1.06. Lavere = bedre utholdenhetsevne.
              </span>
            </div>
          )}

          {/* Secondary predictions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {results.tenKPred && (
              <div data-testid="result-10k" className="rounded-xl border border-[#E5E5E2] bg-white p-5">
                <p className="text-xs font-medium text-[#6B6B65] uppercase tracking-wide mb-1">10K prediksjon</p>
                <p className="text-2xl font-bold tabular-nums text-[#111110]">{formatTime(results.tenKPred.primary)}</p>
                <p className="text-xs text-[#9B9B95] mt-1">{results.tenKPred.method}</p>
              </div>
            )}
            <div data-testid="result-marathon" className="rounded-xl border border-[#E5E5E2] bg-white p-5">
              <p className="text-xs font-medium text-[#6B6B65] uppercase tracking-wide mb-1">Maraton — 42,2 km</p>
              <p className="text-2xl font-bold tabular-nums text-[#111110]">{formatTime(results.marathon.primary)}</p>
              <p className="text-xs text-[#9B9B95] mt-1">{results.marathon.method}</p>
              {results.marathon.warnings
                .filter((w) => !results.halfMarathon.warnings.includes(w))
                .map((w, i) => <p key={i} className="mt-2 text-xs text-amber-600">⚠️ {w}</p>)}
            </div>
          </div>

          {/* Training paces */}
          {results.halfMarathon.paces && (
            <div className="border border-[#E5E5E2] rounded-xl bg-white overflow-hidden">
              <button onClick={() => setShowPaces(!showPaces)}
                className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium text-[#111110] hover:bg-[#F5F5F3]">
                <span className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#FC5200]" />
                  Treningspulssoner — VDOT {results.halfMarathon.vdot}
                </span>
                {showPaces ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showPaces && (
                <div className="border-t border-[#E5E5E2]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#F5F5F3]">
                        <th className="px-5 py-2 text-left text-xs font-medium text-[#6B6B65]">Sone</th>
                        <th className="px-5 py-2 text-right text-xs font-medium text-[#6B6B65]">Tempo (min/km)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ["Rolig (Easy)", `${formatPaceMin(results.halfMarathon.paces!.easy[0])} – ${formatPaceMin(results.halfMarathon.paces!.easy[1])}`],
                        ["Maraton (M)", formatPaceMin(results.halfMarathon.paces!.marathon)],
                        ["Terskel (T)", formatPaceMin(results.halfMarathon.paces!.threshold)],
                        ["Intervall (I)", formatPaceMin(results.halfMarathon.paces!.interval)],
                        ["Repetisjon (R)", formatPaceMin(results.halfMarathon.paces!.repetition)],
                      ].map(([label, value]) => (
                        <tr key={label} className="border-t border-[#E5E5E2]">
                          <td className="px-5 py-2.5 text-[#111110]">{label}</td>
                          <td className="px-5 py-2.5 text-right font-mono text-[#FC5200]">{value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Science footnote */}
          <div className="border border-[#E5E5E2] rounded-xl bg-white overflow-hidden">
            <button onClick={() => setShowScience(!showScience)}
              className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium text-[#111110] hover:bg-[#F5F5F3]">
              <span className="flex items-center gap-2">
                <Info className="w-4 h-4 text-[#6B6B65]" />
                Slik fungerer prediksjonene
              </span>
              {showScience ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showScience && (
              <div className="border-t border-[#E5E5E2] px-5 py-4 text-sm text-[#6B6B65] space-y-2">
                <p>Med én tid brukes <strong>Camerons empiriske formel</strong> — best for distanser opp til halvmaraton. Med to tider beregnes din <strong>personlige k-faktor</strong> (Vickers &amp; Vertosick 2016) som tar hensyn til din individuelle utholdenhetsprofil.</p>
                <p>Treningspulssonene er beregnet fra Jack Daniels VDOT-system.</p>
                <div className="text-xs space-y-1">
                  <p>📄 Riegel, P.S. <em>American Scientist</em> 1981;69(3):285-290.</p>
                  <p>📄 <a href="https://doi.org/10.1186/s13102-016-0052-y" target="_blank" rel="noopener noreferrer" className="text-[#FC5200] underline">Vickers &amp; Vertosick. BMC Sports Sci Med Rehabil 2016;8:26</a></p>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
