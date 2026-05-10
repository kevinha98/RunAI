"use client";

import { useState } from "react";
import type { Week, Session } from "@/lib/plan-data";
import type { OverridesMap } from "@/lib/session-overrides";

interface PlanTableProps {
  weeks: Week[];
  currentWeek: number;
  userId: string;
  initialOverrides: OverridesMap;
}

const PHASE_BADGE: Record<string, string> = {
  Grunntrening: "bg-green-100 text-green-800 border border-green-200",
  Bygging:      "bg-blue-100 text-blue-800 border border-blue-200",
  Topp:         "bg-purple-100 text-purple-800 border border-purple-200",
  Nedtrapping:  "bg-yellow-100 text-yellow-800 border border-yellow-200",
};

const SESSION_TYPE_COLOR: Record<string, string> = {
  "Lett løping":  "bg-green-50 text-green-700 border border-green-200",
  Styrke:         "bg-orange-50 text-orange-700 border border-orange-200",
  Terskelløkt:    "bg-yellow-50 text-yellow-800 border border-yellow-200",
  Intervall:      "bg-red-50 text-red-700 border border-red-200",
  Langkjøring:    "bg-blue-50 text-blue-700 border border-blue-200",
  Hvile:          "bg-gray-50 text-gray-500 border border-gray-200",
  Mobilitet:      "bg-teal-50 text-teal-700 border border-teal-200",
};

function SessionRow({ session }: { session: Session }) {
  const badgeClass =
    SESSION_TYPE_COLOR[session.type] ??
    "bg-gray-50 text-gray-700 border border-gray-200";

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-[#FAFAF8] transition-colors border-b border-[#F0F0EC] last:border-b-0">
      {/* Icon */}
      <span className="text-xl w-8 text-center flex-shrink-0" aria-hidden="true">
        {session.icon}
      </span>

      {/* Day */}
      <span className="w-8 text-xs font-bold text-[#6B6B65] uppercase tracking-wide flex-shrink-0">
        {session.day}
      </span>

      {/* Type badge */}
      <span
        className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${badgeClass}`}
      >
        {session.type}
      </span>

      {/* Distance */}
      <span className="text-sm font-semibold text-[#111110] ml-auto flex-shrink-0">
        {session.distance}
      </span>

      {/* Pace */}
      <span className="text-xs text-[#9B9B95] flex-shrink-0 w-32 text-right">
        {session.pace}
      </span>
    </div>
  );
}

function WeekSessionsPanel({
  week,
  onClose,
}: {
  week: Week;
  onClose: () => void;
}) {
  return (
    <div className="mt-0 mb-2 rounded-b-xl border border-t-0 border-[#E5E5E0] bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#F5F5F3] border-b border-[#E5E5E0]">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-[#111110]">
            Uke {week.week} — øktplan
          </span>
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              PHASE_BADGE[week.phase] ?? "bg-gray-100 text-gray-700 border border-gray-200"
            }`}
          >
            {week.phase}
          </span>
          <span className="text-xs text-[#9B9B95]">{week.totalKm} km totalt</span>
        </div>
        <button
          onClick={onClose}
          aria-label="Lukk ukepanel"
          className="w-6 h-6 flex items-center justify-center rounded-full text-[#6B6B65] hover:text-[#111110] hover:bg-[#E5E5E0] transition-colors text-sm leading-none"
        >
          ✕
        </button>
      </div>

      {/* Sessions */}
      <div>
        {week.sessions.length === 0 ? (
          <p className="px-6 py-6 text-center text-sm text-[#9B9B95]">
            Ingen økter registrert for denne uken.
          </p>
        ) : (
          week.sessions.map((session: Session, idx: number) => (
            <SessionRow key={idx} session={session} />
          ))
        )}
      </div>
    </div>
  );
}

export default function PlanTable({
  weeks,
  currentWeek,
}: PlanTableProps) {
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);

  function toggleWeek(weekNum: number) {
    setSelectedWeek((prev) => (prev === weekNum ? null : weekNum));
  }

  return (
    <div className="rounded-2xl border border-[#E5E5E2] overflow-hidden bg-white">
      {/* Table header */}
      <div className="grid grid-cols-[3rem_1fr_auto_auto] gap-x-4 px-4 py-3 bg-[#F5F5F3] border-b border-[#E5E5E0] text-xs font-semibold text-[#6B6B65] uppercase tracking-wide">
        <span>Uke</span>
        <span>Fase</span>
        <span className="text-right">km</span>
        <span className="text-right">Økter</span>
      </div>

      {/* Rows */}
      {weeks.map((week) => {
        const isCurrentWeek = week.week === currentWeek;
        const isSelected = selectedWeek === week.week;

        return (
          <div key={week.week}>
            {/* Week row */}
            <button
              type="button"
              onClick={() => toggleWeek(week.week)}
              aria-expanded={isSelected}
              aria-label={`Uke ${week.week} — ${week.phase}, ${week.totalKm} km. Klikk for å se enkeltøkter.`}
              className={`w-full grid grid-cols-[3rem_1fr_auto_auto] gap-x-4 items-center px-4 py-3 text-left border-b border-[#F0F0EC] transition-colors cursor-pointer ${
                isCurrentWeek
                  ? "bg-orange-50 hover:bg-orange-100"
                  : isSelected
                  ? "bg-[#F0F0EE] hover:bg-[#EBEBEA]"
                  : "bg-white hover:bg-[#FAFAF8]"
              }`}
            >
              {/* Week number */}
              <span
                className={`text-sm font-bold ${
                  isCurrentWeek ? "text-[#FC5200]" : "text-[#111110]"
                }`}
              >
                {week.week}
                {isCurrentWeek && (
                  <span className="ml-1 text-[10px] font-normal text-[#FC5200] uppercase tracking-wide">
                    nå
                  </span>
                )}
              </span>

              {/* Phase */}
              <span>
                <span
                  className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${
                    PHASE_BADGE[week.phase] ??
                    "bg-gray-100 text-gray-700 border border-gray-200"
                  }`}
                >
                  {week.phase}
                </span>
              </span>

              {/* km */}
              <span className="text-sm font-semibold text-[#111110] tabular-nums text-right">
                {week.totalKm}
              </span>

              {/* Session count + chevron */}
              <span className="flex items-center gap-1 text-xs text-[#9B9B95] justify-end">
                <span>{week.sessions.length}</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`transition-transform duration-200 ${
                    isSelected ? "rotate-180" : "rotate-0"
                  }`}
                  aria-hidden="true"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </span>
            </button>

            {/* Expanded sessions panel */}
            {isSelected && (
              <WeekSessionsPanel
                week={week}
                onClose={() => setSelectedWeek(null)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
