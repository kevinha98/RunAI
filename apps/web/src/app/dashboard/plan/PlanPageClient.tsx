"use client";

import { useState } from "react";
import { WEEKS } from "@/lib/plan-data";
import type { Week, Phase } from "@/lib/plan-data";
import WeekSessionsPanel from "./WeekSessionsPanel";

export type OverridesMap = Record<number, { totalKm?: number; phase?: Phase }>;

interface Props {
  initialOverrides: OverridesMap;
  currentWeek: number;
}

const PHASE_BADGE: Record<Phase, string> = {
  Grunntrening: "bg-green-100 text-green-800 border border-green-200",
  Bygging:      "bg-blue-100 text-blue-800 border border-blue-200",
  Topp:         "bg-purple-100 text-purple-800 border border-purple-200",
  Nedtrapping:  "bg-yellow-100 text-yellow-800 border border-yellow-200",
};

export default function PlanPageClient({ initialOverrides, currentWeek }: Props) {
  const [selectedWeek, setSelectedWeek] = useState<Week | null>(null);

  const weeks: Week[] = WEEKS.map((w) => {
    const override = initialOverrides[w.week];
    if (!override) return w;
    return {
      ...w,
      totalKm: override.totalKm ?? w.totalKm,
      phase: override.phase ?? w.phase,
    };
  });

  return (
    <>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-[#111110] tracking-tight">
          Treningsplan
        </h1>
        <p className="text-sm text-[#6B6B65] mt-1">
          Bergen City Marathon &mdash; 24. april 2027 &middot; 52 uker
        </p>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E5E5E2] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E5E2] bg-[#F5F5F3]">
                <th className="text-left px-4 py-3 font-semibold text-[#6B6B65] text-xs uppercase tracking-wide w-16">
                  Uke
                </th>
                <th className="text-left px-4 py-3 font-semibold text-[#6B6B65] text-xs uppercase tracking-wide">
                  Fase
                </th>
                <th className="text-right px-4 py-3 font-semibold text-[#6B6B65] text-xs uppercase tracking-wide w-20">
                  km
                </th>
                <th className="text-right px-4 py-3 font-semibold text-[#6B6B65] text-xs uppercase tracking-wide w-24">
                  Økter
                </th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((w) => {
                const isCurrent = w.week === currentWeek;
                return (
                  <tr
                    key={w.week}
                    onClick={() => setSelectedWeek(w)}
                    className={
                      [
                        "border-b border-[#F0F0EE] last:border-0 cursor-pointer transition-colors",
                        isCurrent
                          ? "bg-orange-50 hover:bg-orange-100"
                          : "hover:bg-[#F5F5F3]",
                      ].join(" ")
                    }
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={
                            isCurrent
                              ? "font-black text-[#FC5200]"
                              : "font-semibold text-[#111110]"
                          }
                        >
                          {w.week}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] font-bold text-[#FC5200] bg-orange-100 px-1.5 py-0.5 rounded-full leading-none">
                            Nå
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          PHASE_BADGE[w.phase]
                        }`}
                      >
                        {w.phase}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-[#111110]">
                      {w.totalKm}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-xs text-[#6B6B65]">
                        {w.sessions.length} økter
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-[#6B6B65] mt-3">
        Klikk på en uke for å se enkeltøktene.
      </p>

      {/* Week sessions modal */}
      {selectedWeek && (
        <WeekSessionsPanel
          week={selectedWeek}
          onClose={() => setSelectedWeek(null)}
        />
      )}
    </>
  );
}
