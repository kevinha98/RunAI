"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  MessageSquare,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Save,
} from "lucide-react";
import type { SessionEntry } from "@/lib/db/weekly-sessions";
import { getCurrentWeek } from "@/lib/plan-data";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  explanation?: string;
  sessionDiff?: SessionDiff[];
}

interface SessionDiff {
  day: string;
  field: "type" | "distance" | "pace";
  from: string;
  to: string;
}

function diffSessions(before: SessionEntry[], after: SessionEntry[]): SessionDiff[] {
  const diffs: SessionDiff[] = [];
  after.forEach((s) => {
    const b = before.find((x) => x.day === s.day);
    if (!b) return;
    if (b.type !== s.type) diffs.push({ day: s.day, field: "type", from: b.type, to: s.type });
    if (b.distance !== s.distance) diffs.push({ day: s.day, field: "distance", from: b.distance, to: s.distance });
    if (b.pace !== s.pace) diffs.push({ day: s.day, field: "pace", from: b.pace, to: s.pace });
  });
  return diffs;
}

const ICON_MAP: Record<string, string> = {
  "Lett løping": "🏃", "Rolig jogg": "🏃", "Styrke": "💪", "Terskelløkt": "⚡",
  "Intervall": "🔥", "Langkjøring": "🛣️", "Hvile": "😴", "Mobilitet": "🧘",
};

export default function ChatPage() {
  const currentWeek = getCurrentWeek();
  const [weekNumber, setWeekNumber] = useState(currentWeek);
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [originalSessions, setOriginalSessions] = useState<SessionEntry[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showSessions, setShowSessions] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const fiveKSeconds =
    typeof window !== "undefined"
      ? (() => {
          const raw = localStorage.getItem("runai-5k-pr");
          const n = raw ? parseInt(raw, 10) : NaN;
          return isNaN(n) ? undefined : n;
        })()
      : undefined;

  // Load sessions for current week
  const loadSessions = useCallback(async (week: number) => {
    setLoadingSessions(true);
    setHasChanges(false);
    setSaved(false);
    try {
      const res = await fetch(`/api/sessions?week=${week}`);
      const data = await res.json();
      setSessions(data.sessions ?? []);
      setOriginalSessions(data.sessions ?? []);
    } catch {
      setSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    loadSessions(weekNumber);
  }, [weekNumber, loadSessions]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const msg = input.trim();
    if (!msg || sending) return;

    setInput("");
    setSending(true);
    setSaveError(null);

    const optimisticMsg: ChatMessage = { role: "user", content: msg };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const res = await fetch("/api/edit-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          sessions,
          weekNumber,
          history,
          fiveKSeconds,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.error ?? "Noe gikk galt. Prøv igjen." },
        ]);
        return;
      }

      const diffs = diffSessions(sessions, data.sessions);
      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: data.explanation ?? "Uken er oppdatert.",
        explanation: data.explanation,
        sessionDiff: diffs,
      };

      setSessions(data.sessions);
      setHistory(data.history ?? []);
      setMessages((prev) => [...prev, assistantMsg]);
      if (diffs.length > 0) setHasChanges(true);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Nettverksfeil — sjekk tilkoblingen." },
      ]);
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/sessions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week: weekNumber, sessions, source: "manual" }),
      });
      if (!res.ok) throw new Error();
      setSaved(true);
      setHasChanges(false);
      setOriginalSessions(sessions);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setSaveError("Kunne ikke lagre — prøv igjen");
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setSessions(originalSessions);
    setHasChanges(false);
    setMessages([]);
    setHistory([]);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <main className="flex-1 min-h-screen overflow-y-auto bg-[#FAFAF9]">
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-[#6B6B65] hover:text-[#111110] mb-4 transition-colors"
          >
            <ArrowLeft size={12} />
            Tilbake
          </Link>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#FC5200] bg-opacity-10 rounded-xl flex items-center justify-center">
                <MessageSquare size={18} className="text-[#FC5200]" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#111110]">Juster uken</h1>
                <p className="text-xs text-[#6B6B65] mt-0.5">
                  Chat med AI for å endre øktene — på tvers av alle uker
                </p>
              </div>
            </div>

            {/* Week picker */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-[#9B9B95]">Uke:</label>
              <input
                type="number"
                min={1}
                max={52}
                value={weekNumber}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (v >= 1 && v <= 52) setWeekNumber(v);
                }}
                className="w-16 border border-[#E5E5E2] rounded-lg px-2 py-1 text-xs text-center text-[#111110] bg-[#FAFAF9] focus:outline-none focus:ring-2 focus:ring-[#FC5200] focus:ring-opacity-30"
              />
            </div>
          </div>
        </div>

        {/* Current sessions panel */}
        <section className="bg-white border border-[#E5E5E2] rounded-2xl overflow-hidden mb-5">
          <button
            onClick={() => setShowSessions((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-[#FAFAF9] transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[#111110]">
                Uke {weekNumber} — nåværende plan
              </span>
              {hasChanges && (
                <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                  Endret
                </span>
              )}
            </div>
            {showSessions ? <ChevronUp size={14} className="text-[#9B9B95]" /> : <ChevronDown size={14} className="text-[#9B9B95]" />}
          </button>

          {showSessions && (
            <div className="border-t border-[#E5E5E2]">
              {loadingSessions ? (
                <div className="flex items-center gap-2 px-5 py-4 text-xs text-[#9B9B95]">
                  <Loader2 size={13} className="animate-spin" />
                  Laster...
                </div>
              ) : sessions.length === 0 ? (
                <p className="px-5 py-4 text-xs text-[#9B9B95]">Ingen økter for denne uken.</p>
              ) : (
                <ul className="divide-y divide-[#F0F0EE]">
                  {sessions.map((s) => (
                    <li key={s.id} className="flex items-center gap-3 px-5 py-2.5">
                      <span className="text-base">{ICON_MAP[s.type] ?? "🏃"}</span>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-semibold text-[#111110]">{s.day}</span>
                        <span className="text-xs text-[#6B6B65] ml-2">{s.type}</span>
                      </div>
                      <span className="text-xs text-[#9B9B95] tabular-nums">{s.distance}</span>
                      <span className="text-xs text-[#FC5200] font-mono tabular-nums">{s.pace}</span>
                    </li>
                  ))}
                </ul>
              )}

              {/* Save / reset bar */}
              {hasChanges && (
                <div className="flex items-center gap-2 px-5 py-3 border-t border-[#E5E5E2] bg-amber-50">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FC5200] text-white text-xs font-semibold hover:bg-[#e54b00] disabled:opacity-40 transition-colors"
                  >
                    {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                    {saving ? "Lagrer…" : "Godta endringer"}
                  </button>
                  <button
                    onClick={handleReset}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E5E2] text-xs font-medium text-[#6B6B65] hover:border-[#9B9B95] transition-colors"
                  >
                    <RotateCcw size={11} />
                    Angre
                  </button>
                  {saveError && <span className="text-xs text-red-600 ml-1">{saveError}</span>}
                  {saved && (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-700 ml-1">
                      <CheckCircle2 size={11} />
                      Lagret
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Chat */}
        <section className="bg-white border border-[#E5E5E2] rounded-2xl overflow-hidden">
          {/* Messages */}
          <div className="min-h-[200px] max-h-[400px] overflow-y-auto px-5 py-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-[#9B9B95]">Skriv en melding for å justere ukeøktene</p>
                <div className="mt-3 space-y-1.5">
                  {[
                    "Gjør tirsdagens terskeløkt 2 km kortere",
                    "Flytt langkjøringen fra lørdag til søndag",
                    "Legg til en hviledag på onsdag",
                  ].map((ex) => (
                    <button
                      key={ex}
                      onClick={() => setInput(ex)}
                      className="block mx-auto text-xs text-[#FC5200] hover:underline"
                    >
                      "{ex}"
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                      m.role === "user"
                        ? "bg-[#FC5200] text-white rounded-tr-sm"
                        : "bg-[#F5F5F3] text-[#111110] rounded-tl-sm"
                    }`}
                  >
                    <p className="leading-relaxed">{m.role === "assistant" ? m.explanation ?? m.content : m.content}</p>

                    {/* Diff view */}
                    {m.sessionDiff && m.sessionDiff.length > 0 && (
                      <ul className="mt-2 space-y-1 border-t border-[#E5E5E2] pt-2">
                        {m.sessionDiff.map((d, j) => (
                          <li key={j} className="text-[11px] text-[#6B6B65]">
                            <span className="font-semibold text-[#111110]">{d.day}</span>{" "}
                            {d.field}:{" "}
                            <span className="line-through text-[#9B9B95]">{d.from}</span>
                            {" → "}
                            <span className="font-medium text-[#FC5200]">{d.to}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {m.role === "assistant" && m.sessionDiff && m.sessionDiff.length === 0 && (
                      <p className="text-[11px] text-[#9B9B95] mt-1">Ingen endringer i planen.</p>
                    )}
                  </div>
                </div>
              ))
            )}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-[#F5F5F3] rounded-2xl rounded-tl-sm px-4 py-2.5">
                  <Loader2 size={14} className="animate-spin text-[#9B9B95]" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-[#E5E5E2] px-4 py-3 flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="F.eks: &quot;Gjør torsdagsøkten roligere, kneet er litt ømt&quot;"
              rows={2}
              disabled={sending}
              className="flex-1 resize-none rounded-xl border border-[#E5E5E2] bg-[#FAFAF9] px-3 py-2 text-sm text-[#111110] placeholder:text-[#C8C8C4] focus:outline-none focus:ring-2 focus:ring-[#FC5200] focus:ring-opacity-30 transition-all"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="shrink-0 w-9 h-9 rounded-xl bg-[#FC5200] text-white flex items-center justify-center hover:bg-[#e54b00] disabled:opacity-40 transition-colors"
            >
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
          <p className="px-5 pb-3 text-[10px] text-[#9B9B95]">
            Enter for å sende · Shift+Enter for ny linje · Endringer gjelder uke {weekNumber}
          </p>
        </section>

        {/* Alert if no sessions */}
        {!loadingSessions && sessions.length === 0 && (
          <div className="mt-4 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <AlertCircle size={13} />
            Ingen plan for uke {weekNumber} ennå. Gå til dashbordet og generer uke {weekNumber} først.
          </div>
        )}
      </div>
    </main>
  );
}
