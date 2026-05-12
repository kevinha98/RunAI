"use client";

import { useState, useEffect, useRef } from "react";
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
  Trash2,
  Pencil,
} from "lucide-react";
import { InfoPopup, StorageBadge } from "@/components/InfoPopup";

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

// ─── localStorage helpers ────────────────────────────────────────────────────

const LOCAL_HISTORY_KEY = "checkin-history";
const MAX_LOCAL_HISTORY = 4;

function loadLocalHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as HistoryEntry[];
  } catch {
    return [];
  }
}

function saveToLocalHistory(entry: HistoryEntry): HistoryEntry[] {
  const existing = loadLocalHistory();
  // Replace existing entry for same week if present, otherwise prepend
  const filtered = existing.filter((h) => h.week_number !== entry.week_number);
  const updated = [entry, ...filtered].slice(0, MAX_LOCAL_HISTORY);
  try {
    localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(updated));
  } catch {
    // Storage quota exceeded — silently ignore
  }
  return updated;
}

// ─── Markdown renderer ───────────────────────────────────────────────────────

function inlineMd(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-[#111110]">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="italic">$1</em>');
}

function renderMarkdown(text: string): string {
  const lines = text.split("\n");
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("### ")) {
      out.push(`<h3 class="text-sm font-bold text-[#111110] mt-4 mb-1">${inlineMd(line.slice(4))}</h3>`);
      i++;
    } else if (line.startsWith("## ")) {
      out.push(`<h2 class="text-sm font-bold text-[#111110] mt-5 mb-1">${inlineMd(line.slice(3))}</h2>`);
      i++;
    } else if (line.startsWith("# ")) {
      out.push(`<h2 class="text-base font-bold text-[#111110] mt-5 mb-2">${inlineMd(line.slice(2))}</h2>`);
      i++;
    } else if (/^[-*]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        items.push(`<li>${inlineMd(lines[i].replace(/^[-*]\s/, ""))}</li>`);
        i++;
      }
      out.push(`<ul class="list-disc list-inside space-y-0.5 my-2 text-[#3B3B37]">${items.join("")}</ul>`);
    } else if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(`<li>${inlineMd(lines[i].replace(/^\d+\.\s/, ""))}</li>`);
        i++;
      }
      out.push(`<ol class="list-decimal list-inside space-y-0.5 my-2 text-[#3B3B37]">${items.join("")}</ol>`);
    } else if (line.trim() === "") {
      out.push(`<div class="h-2"></div>`);
      i++;
    } else {
      out.push(`<p class="text-[#3B3B37] leading-relaxed">${inlineMd(line)}</p>`);
      i++;
    }
  }
  return out.join("");
}

// ─── LocalHistorySection component ───────────────────────────────────────────

interface LocalHistorySectionProps {
  entries: HistoryEntry[];
  expandedId: string | null;
  onToggle: (id: string) => void;
}

function LocalHistorySection({
  entries,
  expandedId,
  onToggle,
}: LocalHistorySectionProps) {
  if (entries.length === 0) return null;

  return (
    <section className="mt-8">
      <div className="flex items-center gap-2 mb-4">
        <History size={14} className="text-[#9B9B95]" />
        <h2 className="text-sm font-bold text-[#111110]">Siste ukerapporter</h2>
        <span className="ml-auto text-xs text-[#9B9B95]">
          Siste {entries.length} rapport{entries.length !== 1 ? "er" : ""}
        </span>
      </div>

      <ul className="space-y-3">
        {entries.map((entry) => {
          const isOpen = expandedId === entry.id;
          const preview =
            entry.llm_analysis.length > 150
              ? entry.llm_analysis.slice(0, 150).trimEnd() + "…"
              : entry.llm_analysis;

          const formattedDate = (() => {
            try {
              return new Date(entry.created_at || entry.week_date).toLocaleDateString("nb-NO", {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
              });
            } catch {
              return entry.week_date;
            }
          })();

          return (
            <li
              key={entry.id}
              className="bg-white border border-[#E5E5E2] rounded-2xl overflow-hidden hover:border-[#C8C8C4] transition-colors"
            >
              {/* Card header */}
              <button
                type="button"
                onClick={() => onToggle(entry.id)}
                className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-[#FAFAF9] transition-colors"
                aria-expanded={isOpen}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-[#FC5200] bg-opacity-10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-[#FC5200]">
                      U{entry.week_number}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#111110]">
                      Uke {entry.week_number}
                    </p>
                    <p className="text-[11px] text-[#9B9B95]">{formattedDate}</p>
                  </div>
                </div>
                {isOpen ? (
                  <ChevronUp size={14} className="text-[#9B9B95] shrink-0 ml-3" />
                ) : (
                  <ChevronDown size={14} className="text-[#9B9B95] shrink-0 ml-3" />
                )}
              </button>

              {/* Collapsed preview */}
              {!isOpen && (
                <div className="px-4 pb-3.5 -mt-1">
                  <p className="text-xs text-[#6B6B65] leading-relaxed">
                    {preview}
                  </p>
                </div>
              )}

              {/* Expanded content */}
              {isOpen && (
                <div className="border-t border-[#E5E5E2] px-4 py-4 space-y-4">
                  {/* Full LLM analysis */}
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
                  {/* User report */}
                  {entry.user_report && (
                    <div>
                      <p className="text-[10px] font-semibold text-[#9B9B95] uppercase tracking-wide mb-1.5">
                        Din rapport
                      </p>
                      <p className="text-xs text-[#3B3B37] leading-relaxed whitespace-pre-wrap">
                        {entry.user_report}
                      </p>
                    </div>
                  )}
                  {/* Adjustments */}
                  {entry.adjustments && entry.adjustments.length > 0 && (
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
    </section>
  );
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
  const [localHistory, setLocalHistory] = useState<HistoryEntry[]>([]);
  const [expandedLocalId, setExpandedLocalId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load server history on mount
  useEffect(() => {
    fetch("/api/checkin")
      .then((r) => r.json())
      .then((d) => setHistory(d.checkins ?? []))
      .catch(() => setHistory([]))
      .finally(() => setLoadingHistory(false));
  }, []);

  // Load localStorage history on mount
  useEffect(() => {
    setLocalHistory(loadLocalHistory());
  }, []);

  const charCount = report.length;
  const canSubmit = charCount >= 10 && charCount <= 4000 && !submitting;

  function toggleLocalHistory(id: string) {
    setExpandedLocalId((prev) => (prev === id ? null : id));
  }

  async function handleDelete(id: string) {
    if (!confirm("Slette denne rapporten?")) return;
    setDeletingId(id);
    try {
      await fetch(`/api/checkin/${id}`, { method: "DELETE" });
      setHistory((prev) => prev.filter((h) => h.id !== id));
      // Also remove from localStorage
      const updated = loadLocalHistory().filter((h) => h.id !== id);
      localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(updated));
      setLocalHistory(updated);
    } finally {
      setDeletingId(null);
    }
  }

  function handleEdit(entry: HistoryEntry) {
    setReport(entry.user_report);
    setResult(null);
    setError(null);
    setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  }

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

      // Build new history entry
      const newEntry: HistoryEntry = {
        id: data.id ?? `local-${Date.now()}`,
        week_number: data.weekNumber,
        week_date: new Date().toISOString().slice(0, 10),
        user_report: report,
        llm_analysis: data.analysis,
        adjustments: data.adjustments ?? [],
        created_at: new Date().toISOString(),
      };

      // Save to localStorage and update local history state
      const updatedLocal = saveToLocalHistory(newEntry);
      setLocalHistory(updatedLocal);

      // Prepend to server history list
      if (data.id) {
        setHistory((prev) => [
          newEntry,
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
            <h1 className="text-xl font-bold text-[#111110] flex items-center gap-2">
              Ukerapport
              <InfoPopup>
                <strong className="block mb-1">Ukerapport</strong>
                <p className="mb-1">Skriv fritt om uken — form, energinivå, skader, økter du fullførte og misset. AI-en analyserer og justerer planen din.</p>
                <p className="mb-2">Historikken vises under og brukes av coachen når du ber om vurdering.</p>
                <StorageBadge type="supabase" />
                <p className="mt-1 text-[10px] text-[#9B9B95]">Rapporter lagres permanent i skyen og kan redigeres eller slettes fra historikk-listen nedenfor.</p>
              </InfoPopup>
            </h1>
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
          ref={textareaRef}
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

      {/* Server History */}
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
                      {/* Action buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(entry)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E5E2] text-xs font-medium text-[#6B6B65] hover:border-[#FC5200] hover:text-[#FC5200] transition-colors"
                        >
                          <Pencil size={11} />
                          Rediger
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          disabled={deletingId === entry.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E5E2] text-xs font-medium text-[#6B6B65] hover:border-red-400 hover:text-red-500 transition-colors disabled:opacity-40"
                        >
                          {deletingId === entry.id ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                          Slett
                        </button>
                      </div>
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

      {/* localStorage-based recent history */}
      <LocalHistorySection
        entries={localHistory}
        expandedId={expandedLocalId}
        onToggle={toggleLocalHistory}
      />
    </main>
  );
}
