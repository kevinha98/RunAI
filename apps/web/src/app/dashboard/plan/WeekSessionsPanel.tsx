"use client";

import type { Week, Session } from "@/lib/plan-data";

interface WeekSessionsPanelProps {
  week: Week;
  onClose: () => void;
}

export default function WeekSessionsPanel({
  week,
  onClose,
}: WeekSessionsPanelProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-[#111110]">
              Uke {week.week} &mdash; {week.phase}
            </h2>
            <p className="text-sm text-[#6B6B65] mt-0.5">{week.totalKm} km totalt</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full w-8 h-8 flex items-center justify-center hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors ml-4 shrink-0"
            aria-label="Lukk"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Sessions list */}
        <ul className="divide-y divide-[#F0F0EE]">
          {week.sessions.map((session: Session, idx: number) => (
            <li
              key={idx}
              className="flex items-center gap-3 py-3"
            >
              <span className="text-2xl w-9 text-center shrink-0">
                {session.icon}
              </span>
              <div className="w-10 shrink-0">
                <span className="text-xs font-semibold text-[#6B6B65] uppercase tracking-wide">
                  {session.day}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#111110] truncate">
                  {session.type}
                </p>
                <p className="text-xs text-[#6B6B65] mt-0.5">
                  {session.pace}
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-sm font-bold text-[#111110]">
                  {session.distance}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
