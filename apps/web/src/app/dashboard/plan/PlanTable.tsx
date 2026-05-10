"use client";

import { useState, useTransition, useCallback } from "react";
import type { Week, Session } from "@/lib/plan-data";
import { SESSION_ICONS } from "@/lib/plan-data";
import type { SessionOverride, OverridesMap } from "@/lib/session-overrides";
import { updateSessionOverride, deleteSessionOverride } from "@/lib/session-overrides";
import { ChevronDown, ChevronUp, Pencil, RotateCcw, X, Check, Loader2 } from "lucide-react";

// ─── Phase badge colours ──────────────────────────────────────────────────────

const PHASE_CLASSES: Record<string, string> = {
  Grunntrening: "bg-green-100 text-green-800 border border-green-200",
  Bygging:      "bg-blue-100 text-blue-800 border border-blue-200",
  Topp:         "bg-purple-100 text-purple-800 border border-purple-200",
  Nedtrapping:  "bg-yellow-100 text-yellow-800 border border-yellow-200",
};

// ─── Session type options ─────────────────────────────────────────────────────

const SESSION_TYPE_OPTIONS = [
  "Lett løping",
  "Styrke",
  "Terskelløkt",
  "Intervall",
  "Langkjøring",
  "Hvile",
  "Mobilitet",
];

// ─── EditSessionModal ─────────────────────────────────────────────────────────

interface EditModalProps {
  weekNum: number;
  session: Session;
  userId: string;
  isOverridden: boolean;
  onClose: () => void;
  onSaved: (weekNum: number, day: string, patch: SessionOverride | null) => void;
}

function EditSessionModal({ weekNum, session, userId, isOverridden, onClose, onSaved }: EditModalProps) {
  const [type, setType] = useState(session.type);
  const [distance, setDistance] = useState(session.distance);
  const [pace, setPace] = useState(session.pace);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  function handleSave() {
    setErrorMsg(null);
    startTransition(async () => {
      const icon = SESSION_ICONS[type] ?? session.icon;
      const patch: SessionOverride = { type, distance, pace, icon };
      const result = await updateSessionOverride(userId, weekNum, session.day, patch);
      if (!result.success) {
        setErrorMsg(result.error ?? "Kunne ikke lagre");
        return;
      }
      onSaved(weekNum, session.day, patch);
      onClose();
    });
  }

  function handleRevert() {
    setErrorMsg(null);
    setIsDeleting(true);
    startTransition(async () => {
      const result = await deleteSessionOverride(userId, weekNum, session.day);
      if (!result.success) {
        setErrorMsg(result.error ?? "Kunne ikke tilbakestille");
        setIsDeleting(false);
        return;
      }
      onSaved(weekNum, session.day, null);
      onClose();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E5E2]">
          <div>
            <p className="text-xs text-[#9B9B95] font-medium">Uke {weekNum} · {session.day}</p>
            <h2 className="text-base font-bold text-[#111110]">Rediger økt</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F5F5F3] transition-colors"
            aria-label="Lukk"
          >
            <X size={16} className="text-[#6B6B65]" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Type */}
          <div>
            <label className="block text-xs font-semibold text-[#6B6B65] mb-1.5">Økttype</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full border border-[#E5E5E2] rounded-xl px-3 py-2.5 text-sm text-[#111110] bg-white focus:outline-none focus:ring-2 focus:ring-[#FC5200]/30 focus:border-[#FC5200] transition-colors"
            >
              {SESSION_TYPE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{SESSION_ICONS[opt] ?? ""} {opt}</option>
              ))}
            </select>
          </div>

          {/* Distance */}
          <div>
            <label className="block text-xs font-semibold text-[#6B6B65] mb-1.5">Distanse</label>
            <input
              type="text"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              placeholder="f.eks. 10 km eller 45 min"
              className="w-full border border-[#E5E5E2] rounded-xl px-3 py-2.5 text-sm text-[#111110] placeholder-[#C8C8C4] focus:outline-none focus:ring-2 focus:ring-[#FC5200]/30 focus:border-[#FC5200] transition-colors"
            />
          </div>

          {/* Pace */}
          <div>
            <label className="block text-xs font-semibold text-[#6B6B65] mb-1.5">Tempo / beskrivelse</label>
            <input
              type="text"
              value={pace}
              onChange={(e) => setPace(e.target.value)}
              placeholder="f.eks. 5:30/km eller Rolig"
              className="w-full border border-[#E5E5E2] rounded-xl px-3 py-2.5 text-sm text-[#111110] placeholder-[#C8C8C4] focus:outline-none focus:ring-2 focus:ring-[#FC5200]/30 focus:border-[#FC5200] transition-colors"
            />
          </div>

          {errorMsg && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {errorMsg}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[#E5E5E2] flex items-center gap-2">
          {isOverridden && (
            <button
              onClick={handleRevert}
              disabled={isPending}
              className="flex items-center gap-1.5 text-xs text-[#9B9B95] hover:text-[#6B6B65] transition-colors px-2 py-1.5 rounded-lg hover:bg-[#F5F5F3] mr-auto"
              title="Tilbakestill til original"
            >
              {isDeleting && isPending ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <RotateCcw size={12} />
              )}
              Tilbakestill
            </button>
          )}
          <button
            onClick={onClose}
            disabled={isPending}
            className="flex-1 px-4 py-2.5 text-sm font-semibold text-[#6B6B65] border border-[#E5E5E2] rounded-xl hover:bg-[#F5F5F3] transition-colors"
          >
            Avbryt
          </button>
          <button
            onClick={handleSave}
            disabled={isPending}
            className="flex-1 px-4 py-2.5 text-sm font-semibold text-white rounded-xl transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60"
            style={{ backgroundColor: "#FC5200" }}
          >
            {isPending && !isDeleting ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Check size={13} />
            )}
            Lagre
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── WeekRow ──────────────────────────────────────────────────────────────────

interface WeekRowProps {
  week: Week;
  isOpen: boolean;
  isCurrent: boolean;
  overrides: OverridesMap;
  userId: string;
  onToggle: () => void;
  onSaved: (weekNum: number, day: string, patch: SessionOverride | null) => void;
}

function WeekRow({ week, isOpen, isCurrent, overrides, userId, onToggle, onSaved }: WeekRowProps) {
  const [editingSession, setEditingSession] = useState<Session | null>(null);

  return (
    <>
      {/* Week summary row */}
      <tr
        className={`cursor-pointer select-none transition-colors ${
          isOpen ? "bg-[#FFF8F5]" : "hover:bg-[#F9F9F8]"
        } ${isCurrent ? "font-semibold" : ""}`}
        onClick={onToggle}
      >
        <td className="px-3 py-3 text-sm tabular-nums">
          {isCurrent && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-[10px] font-bold mr-1.5" style={{ backgroundColor: "#FC5200" }}>
              {week.week}
            </span>
          )}
          {!isCurrent && <span className="text-[#6B6B65]">{week.week}</span>}
        </td>
        <td className="px-3 py-3">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            PHASE_CLASSES[week.phase] ?? "bg-gray-100 text-gray-700"
          }`}>
            {week.phase}
          </span>
        </td>
        <td className="px-3 py-3 text-sm tabular-nums">{week.totalKm} km</td>
        <td className="px-3 py-3 text-xs text-[#9B9B95]">
          {week.sessions.filter((s) => s.type !== "Hvile").length} økter
        </td>
        <td className="px-3 py-3 text-right">
          {isOpen ? (
            <ChevronUp size={15} className="text-[#9B9B95] inline" />
          ) : (
            <ChevronDown size={15} className="text-[#9B9B95] inline" />
          )}
        </td>
      </tr>

      {/* Expanded sessions */}
      {isOpen && (
        <tr>
          <td colSpan={5} className="px-0 pb-2">
            <div className="mx-3 mb-1 rounded-xl border border-[#E5E5E2] overflow-hidden bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#F9F9F8] border-b border-[#E5E5E2]">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-[#9B9B95] w-10">Dag</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-[#9B9B95]">Type</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-[#9B9B95]">Distanse</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-[#9B9B95] hidden sm:table-cell">Tempo</th>
                    <th className="px-3 py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {week.sessions.map((session, idx) => {
                    const key = `${week.week}-${session.day}`;
                    const isOverridden = !!overrides[key];
                    return (
                      <tr
                        key={idx}
                        className="border-b border-[#F0F0EE] last:border-0 hover:bg-[#FAFAF9] group"
                      >
                        <td className="px-3 py-2.5 text-xs font-medium text-[#6B6B65]">{session.day}</td>
                        <td className="px-3 py-2.5">
                          <span className="flex items-center gap-1.5">
                            <span className="text-base leading-none">{session.icon}</span>
                            <span className={`text-sm ${
                              session.type === "Hvile" ? "text-[#9B9B95]" : "text-[#111110]"
                            }`}>
                              {session.type}
                            </span>
                            {isOverridden && (
                              <span className="inline-flex items-center text-[9px] font-semibold text-[#FC5200] bg-orange-50 border border-orange-200 rounded px-1 py-0.5 ml-0.5">edited</span>
                            )}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-sm text-[#6B6B65] tabular-nums">{session.distance}</td>
                        <td className="px-3 py-2.5 text-xs text-[#9B9B95] hidden sm:table-cell">{session.pace}</td>
                        <td className="px-3 py-2.5 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingSession(session);
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F5F5F3] text-[#9B9B95] hover:text-[#FC5200]"
                            title="Rediger økt"
                          >
                            <Pencil size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}

      {/* Edit modal */}
      {editingSession && (
        <EditSessionModal
          weekNum={week.week}
          session={editingSession}
          userId={userId}
          isOverridden={!!overrides[`${week.week}-${editingSession.day}`]}
          onClose={() => setEditingSession(null)}
          onSaved={(wNum, day, patch) => {
            onSaved(wNum, day, patch);
            setEditingSession(null);
          }}
        />
      )}
    </>
  );
}

// ─── PlanTable (main export) ──────────────────────────────────────────────────

interface PlanTableProps {
  weeks: Week[];
  currentWeek: number;
  userId: string;
  initialOverrides: OverridesMap;
}

export default function PlanTable({ weeks, currentWeek, userId, initialOverrides }: PlanTableProps) {
  const [openWeeks, setOpenWeeks] = useState<Set<number>>(() => new Set([currentWeek]));
  const [overrides, setOverrides] = useState<OverridesMap>(initialOverrides);

  // Merge overrides into display weeks
  const displayWeeks: Week[] = weeks.map((week) => ({
    ...week,
    sessions: week.sessions.map((session) => {
      const key = `${week.week}-${session.day}`;
      const override = overrides[key];
      if (!override) return session;
      const newType = override.type ?? session.type;
      return {
        ...session,
        type: newType,
        distance: override.distance ?? session.distance,
        pace: override.pace ?? session.pace,
        icon: override.icon ?? SESSION_ICONS[newType] ?? session.icon,
      };
    }),
  }));

  function toggleWeek(weekNum: number) {
    setOpenWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(weekNum)) {
        next.delete(weekNum);
      } else {
        next.add(weekNum);
      }
      return next;
    });
  }

  const handleSaved = useCallback((weekNum: number, day: string, patch: SessionOverride | null) => {
    const key = `${weekNum}-${day}`;
    setOverrides((prev) => {
      if (patch === null) {
        const { [key]: _removed, ...rest } = prev;
        return rest as OverridesMap;
      }
      return { ...prev, [key]: patch };
    });
  }, []);

  return (
    <div className="rounded-2xl border border-[#E5E5E2] overflow-hidden bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#F9F9F8] border-b border-[#E5E5E2]">
            <th className="px-3 py-3 text-left text-xs font-semibold text-[#9B9B95] w-12">Uke</th>
            <th className="px-3 py-3 text-left text-xs font-semibold text-[#9B9B95]">Fase</th>
            <th className="px-3 py-3 text-left text-xs font-semibold text-[#9B9B95]">Km</th>
            <th className="px-3 py-3 text-left text-xs font-semibold text-[#9B9B95]">Økter</th>
            <th className="px-3 py-3 w-8"></th>
          </tr>
        </thead>
        <tbody>
          {displayWeeks.map((week) => (
            <WeekRow
              key={week.week}
              week={week}
              isOpen={openWeeks.has(week.week)}
              isCurrent={week.week === currentWeek}
              overrides={overrides}
              userId={userId}
              onToggle={() => toggleWeek(week.week)}
              onSaved={handleSaved}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
