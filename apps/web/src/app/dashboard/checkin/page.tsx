"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ClipboardList,
  ArrowLeft,
  Send,
  Loader2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  History,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlanAdjustment {
  weekNum: number;
  day: string;
  field: string;
  from: string;
  to: string;
  reason: string;
}

interface CheckinResult {
  id: string | null;
  weekNumber: number;
  analysis: string;
  adjustments: PlanAdjustment[];
}

interface HistoryEntry {
  id: string;
  week_number: number;
  week_date: string;
  user_report: string;
  llm_analysis: string;
  adjustments: PlanAdjustment[];
  created_at: string;
}

// ─── Markdown renderer (lightweight, no dep needed) ──────────────────────────

function renderMarkdown(text: string): string {
  return text
    .replace(/^### (.+)$/gm, "<h3 class=\"text-sm font-bold text-[#111110] mt-5 mb-2\">$1</h3>")
    .replace(/^## (.+)$/gm, "<h2 class=\"text-base font-bold text-[#111110] mt-6 mb-2\">$1</h2>")
    .replace(/^# (.+)$/gm, "<h1 class=\"text-lg font-bold text-[#111110] mt-6 mb-3\">$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong class=\"font-semibold\">$1</strong>")
    .replace(/\*(.+?)\*/g, "<em class=\"italic\">$1</em>")
    .replace(/^- (.+)$/gm, "<li class=\"ml-4 list-disc text-[#3B3B37]\">$1</li>")
    .replace(/(<li[\s\S]*?<\/li>)/g, "<ul class=\"space-y-1 my-2\">$1</ul>")
    .replace(/\n{2,}/g, "</p><p class=\"text-[#3B3B37] leading-relaxed mt-3\">")
    .replace(/^(?!<[hul])(.+)$/gm, "<p class=\"text-[#3B3B37] leading-relaxed\">$1</p>");
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CheckinPage() {
  const [report, setReport] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CheckinResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);
  const [showAdjustments, setShowAdjustments] = useState(false);

  // Load history on mount
  useEffect(() => {
    fetch("/api/checkin")
      .then((r) => r.json())
      .then((d) => setHistory(d.checkins ?? []))
      .catch(() => setHistory([]))
      .finally(() => setLoadingHistory(false));
  }, []);

  const charCount = report.length;
  const canSubmit = charCount >= 10 && charCount <= 4000 && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    setResult(null);
    setShowAdjustments(false);

    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Noe gikk galt");
        return;
      }

      setResult(data as CheckinResult);
      setReport("");

      // Prepend to history list
      if (data.id) {
        setHistory((prev) => [
          {
            id: data.id,
            week_number: data.weekNumber,
            week_date: new Date().toISOString().slice(0, 10),
            user_report: report,
            llm_analysis: data.analysis,
            adjustments: data.adjustments,
            created_at: new Date().toISOString(),
          },
          ...prev.filter((h) => h.week_number !== data.weekNumber),
        ]);
      }
    } catch {
      setError("Klarte ikke sende rapporten. Sjekk internettforbindelsen.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex-1 min-h-screen overflow-y-auto bg-[#FAFAF9] p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-[#6B6B65] hover:text-[#111110] mb-4 transition-colors"
        >
          <ArrowLeft size={12} />
          Tilbake til oversikt
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#FC5200] bg-opacity-10 rounded-xl flex items-center justify-center">
            <ClipboardList size={18} className="text-[#FC5200]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#111110]">Ukerapport</h1>
            <p className="text-xs text-[#6B6B65] mt-0.5">
              Fortell treneren din hvordan uken gikk — AI-en analyserer og justerer neste ukes plan
            </p>
          </div>
        </div>
      </div>

      {/* Write report */}
      <section className="bg-white border border-[#E5E5E2] rounded-2xl p-5 mb-6">
        <h2 className="text-sm font-bold text-[#111110] mb-3">Hvordan gikk uken?</h2>
        <p className="text-xs text-[#6B6B65] mb-4 leading-relaxed">
          Skriv fritt om form, energinivå, skader, motivasjon, hva du klarte og hva du ikke klarte.
          Jo mer du deler, jo bedre råd får du.
        </p>
        <textarea
          value={report}
          onChange={(e) => setReport(e.target.value)}
          rows={7}
          placeholder="Eks: Langkjøringen lørdag var tung — bena var slitne etter terskeløkten torsdag. Kneet bikka litt på slutten. Ellers god uke, fikk gjort alle øktene..."
          className="w-full resize-none rounded-xl border border-[#E5E5E2] bg-[#FAFAF9] px-4 py-3 text-sm text-[#111110] placeholder:text-[#C8C8C4] focus:outline-none focus:ring-2 focus:ring-[#FC5200] focus:ring-opacity-30 transition-all"
          disabled={submitting}
        />
        <div className="flex items-center justify-between mt-3">
          <span
            className={`text-xs tabular-nums ${
              charCount > 4000
                ? "text-red-500"
                : charCount < 10 && charCount > 0
                ? "text-amber-500"
                : "text-[#9B9B95]"
            }`}
          >
            {charCount} / 4000
          </span>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FC5200] text-white text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#e54b00] active:scale-95 transition-all"
          >
            {submitting ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                Analyserer...
              </>
            ) : (
              <>
                <Send size={13} />
                Send til trener
              </>
            )}
          </button>
        </div>
        {error && (
          <div className="mt-3 flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
            <AlertCircle size={13} />
            {error}
          </div>
        )}
      </section>

      {/* LLM result */}
      {result && (
        <section className="bg-white border border-[#E5E5E2] rounded-2xl p-5 mb-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 size={15} className="text-emerald-500" />
            <h2 className="text-sm font-bold text-[#111110]">
              Treneren din svarer — uke {result.weekNumber}
            </h2>
          </div>

          {/* Analysis */}
          <div
            className="prose-sm text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(result.analysis) }}
          />

          {/* Adjustments */}
          {result.adjustments.length > 0 && (
            <div className="mt-5 border-t border-[#E5E5E2] pt-4">
              <button
                onClick={() => setShowAdjustments((v) => !v)}
                className="flex items-center gap-2 text-xs font-semibold text-[#FC5200] hover:text-[#e54b00] transition-colors"
              >
                {showAdjustments ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                {result.adjustments.length} planforslag
              </button>
              {showAdjustments && (
                <ul className="mt-3 space-y-2">
                  {result.adjustments.map((adj, i) => (
                    <li
                      key={i}
                      className="bg-[#FFF8F5] border border-[#FCDCC8] rounded-xl px-3 py-2.5 text-xs"
                    >
                      <span className="font-semibold text-[#FC5200]">
                        Uke {adj.weekNum}, {adj.day} — {adj.field}
                      </span>
                      <span className="text-[#6B6B65]">
                        {" "}
                        fra <span className="line-through">{adj.from}</span> til{" "}
                        <span className="font-medium text-[#111110]">{adj.to}</span>
                      </span>
                      <p className="text-[#9B9B95] mt-0.5">{adj.reason}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
      )}

      {/* History */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <History size={14} className="text-[#9B9B95]" />
          <h2 className="text-sm font-bold text-[#111110]">Logg</h2>
        </div>

        {loadingHistory ? (
          <div className="flex items-center gap-2 text-xs text-[#9B9B95] py-4">
            <Loader2 size={13} className="animate-spin" />
            Laster historikk...
          </div>
        ) : history.length === 0 ? (
          <div className="bg-white border border-dashed border-[#E5E5E2] rounded-2xl p-6 text-center">
            <p className="text-sm text-[#9B9B95]">Ingen rapporter ennå.</p>
            <p className="text-xs text-[#C8C8C4] mt-1">
              Send din første rapport ovenfor for å starte loggen.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {history.map((entry) => {
              const isExpanded = expandedHistory === entry.id;
              const dateStr = new Date(entry.created_at).toLocaleDateString("nb-NO", {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
              });
              return (
                <li
                  key={entry.id}
                  className="bg-white border border-[#E5E5E2] rounded-2xl overflow-hidden hover:border-[#C8C8C4] transition-colors"
                >
                  <button
                    onClick={() =>
                      setExpandedHistory(isExpanded ? null : entry.id)
                    }
                    className="w-full flex items-start justify-between px-4 py-3 text-left"
                  >
                    <div>
                      <span className="text-xs font-semibold text-[#FC5200]">
                        Uke {entry.week_number}
                      </span>
                      <span className="text-xs text-[#9B9B95] ml-2">{dateStr}</span>
                      <p className="text-xs text-[#6B6B65] mt-1 line-clamp-2">
                        {entry.user_report.slice(0, 120)}
                        {entry.user_report.length > 120 ? "…" : ""}
                      </p>
                    </div>
                    {isExpanded ? (
                      <ChevronUp size={14} className="text-[#9B9B95] shrink-0 mt-0.5" />
                    ) : (
                      <ChevronDown size={14} className="text-[#9B9B95] shrink-0 mt-0.5" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="border-t border-[#E5E5E2] px-4 py-4 space-y-4">
                      {/* Full report */}
                      <div>
                        <p className="text-[10px] font-semibold text-[#9B9B95] uppercase tracking-wide mb-1.5">
                          Din rapport
                        </p>
                        <p className="text-xs text-[#3B3B37] leading-relaxed whitespace-pre-wrap">
                          {entry.user_report}
                        </p>
                      </div>
                      {/* Analysis */}
                      <div>
                        <p className="text-[10px] font-semibold text-[#9B9B95] uppercase tracking-wide mb-1.5">
                          Trenerens analyse
                        </p>
                        <div
                          className="text-xs leading-relaxed"
                          dangerouslySetInnerHTML={{
                            __html: renderMarkdown(entry.llm_analysis),
                          }}
                        />
                      </div>
                      {/* Adjustments */}
                      {entry.adjustments.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold text-[#9B9B95] uppercase tracking-wide mb-1.5">
                            Planforslag ({entry.adjustments.length})
                          </p>
                          <ul className="space-y-1.5">
                            {entry.adjustments.map((adj, i) => (
                              <li
                                key={i}
                                className="bg-[#FFF8F5] border border-[#FCDCC8] rounded-lg px-2.5 py-2 text-[11px]"
                              >
                                <span className="font-semibold text-[#FC5200]">
                                  Uke {adj.weekNum}, {adj.day}
                                </span>{" "}
                                —{" "}
                                <span className="line-through text-[#9B9B95]">{adj.from}</span>{" "}
                                →{" "}
                                <span className="font-medium text-[#111110]">{adj.to}</span>
                                <p className="text-[#9B9B95] mt-0.5">{adj.reason}</p>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
