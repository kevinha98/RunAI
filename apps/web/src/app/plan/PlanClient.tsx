"use client";

import { useState, useEffect, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { WEEKS, SESSION_ICONS, Week, Session } from "@/lib/plan-data";
import { OverridesMap, SessionOverride, SessionOverrideKey } from "@/lib/session-overrides";

interface PlanClientProps {
  weeks: Week[];
  currentWeek: number;
  userId: string;
  initialOverrides: OverridesMap;
}

interface EditState {
  weekNum: number;
  day: string;
  field: SessionOverrideKey;
  value: string;
}

const SESSION_TYPE_OPTIONS = Object.keys(SESSION_ICONS);

function buildKey(weekNum: number, day: string): string {
  return `${weekNum}-${day}`;
}

function applyOverrides(weeks: Week[], overrides: OverridesMap): Week[] {
  return weeks.map((week) => ({
    ...week,
    sessions: week.sessions.map((session) => {
      const key = buildKey(week.week, session.day);
      const override = overrides[key];
      if (!override) return session;
      const merged: Session = { ...session };
      if (override.distance !== undefined) merged.distance = override.distance;
      if (override.pace !== undefined) merged.pace = override.pace;
      if (override.type !== undefined) {
        merged.type = override.type;
        merged.icon = SESSION_ICONS[override.type] ?? merged.icon;
      }
      return merged;
    }),
  }));
}

export default function PlanClient({
  weeks,
  currentWeek,
  userId,
  initialOverrides,
}: PlanClientProps) {
  const [overrides, setOverrides] = useState<OverridesMap>(initialOverrides);
  const [mergedWeeks, setMergedWeeks] = useState<Week[]>(() =>
    applyOverrides(weeks, initialOverrides)
  );
  const [editingCell, setEditingCell] = useState<{
    weekNum: number;
    day: string;
  } | null>(null);
  const [editValues, setEditValues] = useState<{
    distance: string;
    pace: string;
    type: string;
  } | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{
    weekNum: number;
    day: string;
  } | null>(null);
  const [saving, startSaving] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    setMergedWeeks(applyOverrides(weeks, overrides));
  }, [overrides, weeks]);

  function openEdit(weekNum: number, session: Session) {
    const key = buildKey(weekNum, session.day);
    const override = overrides[key];
    setEditingCell({ weekNum, day: session.day });
    setEditValues({
      distance: override?.distance ?? session.distance,
      pace: override?.pace ?? session.pace,
      type: override?.type ?? session.type,
    });
    setSaveError(null);
  }

  function closeEdit() {
    setEditingCell(null);
    setEditValues(null);
    setSaveError(null);
  }

  async function saveField(
    weekNum: number,
    day: string,
    field: SessionOverrideKey,
    value: string
  ): Promise<void> {
    const { error } = await supabase.from("plan_overrides").upsert(
      {
        user_id: userId,
        week: weekNum,
        day,
        field,
        value,
      },
      { onConflict: "user_id,week,day,field" }
    );
    if (error) throw new Error(error.message);
  }

  function handleSave() {
    if (!editingCell || !editValues) return;
    const { weekNum, day } = editingCell;
    const key = buildKey(weekNum, day);

    startSaving(async () => {
      try {
        const fieldsToSave: Array<{ field: SessionOverrideKey; value: string }> = [
          { field: "distance", value: editValues.distance },
          { field: "pace", value: editValues.pace },
          { field: "type", value: editValues.type },
        ];

        await Promise.all(
          fieldsToSave.map(({ field, value }) => saveField(weekNum, day, field, value))
        );

        setOverrides((prev) => ({
          ...prev,
          [key]: {
            distance: editValues.distance,
            pace: editValues.pace,
            type: editValues.type,
          } as SessionOverride,
        }));
        closeEdit();
      } catch (err) {
        setSaveError(
          err instanceof Error ? err.message : "Feil ved lagring"
        );
      }
    });
  }

  async function handleReset(weekNum: number, day: string) {
    const key = buildKey(weekNum, day);
    try {
      const { error } = await supabase
        .from("plan_overrides")
        .delete()
        .eq("user_id", userId)
        .eq("week", weekNum)
        .eq("day", day);
      if (error) throw new Error(error.message);
      setOverrides((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      closeEdit();
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Feil ved tilbakestilling"
      );
    }
  }

  const phaseColors: Record<string, string> = {
    Grunntrening: "bg-blue-100 text-blue-800",
    Bygging: "bg-orange-100 text-orange-800",
    Topp: "bg-red-100 text-red-800",
    Nedtrapping: "bg-green-100 text-green-800",
  };

  return (
    <div className="space-y-8">
      {mergedWeeks.map((week) => (
        <div
          key={week.week}
          className={`rounded-2xl border ${
            week.week === currentWeek
              ? "border-blue-500 shadow-lg"
              : "border-gray-200"
          } overflow-hidden`}
        >
          {/* Week header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <span className="font-bold text-gray-900 text-sm">
                Uke {week.week}
              </span>
              {week.week === currentWeek && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-500 text-white">
                  Nåværende uke
                </span>
              )}
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  phaseColors[week.phase] ?? "bg-gray-100 text-gray-700"
                }`}
              >
                {week.phase}
              </span>
            </div>
            <span className="text-sm text-gray-500 font-medium">
              {week.totalKm} km totalt
            </span>
          </div>

          {/* Sessions grid */}
          <div className="divide-y divide-gray-100">
            {week.sessions.map((session) => {
              const key = buildKey(week.week, session.day);
              const isEditing =
                editingCell?.weekNum === week.week &&
                editingCell?.day === session.day;
              const isHovered =
                hoveredCell?.weekNum === week.week &&
                hoveredCell?.day === session.day;
              const hasOverride = !!overrides[key];

              return (
                <div
                  key={session.day}
                  className="relative"
                  onMouseEnter={() =>
                    setHoveredCell({ weekNum: week.week, day: session.day })
                  }
                  onMouseLeave={() => setHoveredCell(null)}
                >
                  {/* Normal row */}
                  {!isEditing && (
                    <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                      <span className="w-8 text-xs font-semibold text-gray-500 shrink-0">
                        {session.day}
                      </span>
                      <span className="text-lg shrink-0">{session.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-sm font-medium ${
                              hasOverride
                                ? "text-blue-700"
                                : "text-gray-900"
                            }`}
                          >
                            {session.type}
                          </span>
                          {hasOverride && (
                            <span className="text-xs text-blue-500 font-medium">
                              (endret)
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-gray-500">
                            {session.distance}
                          </span>
                          <span className="text-xs text-gray-400">·</span>
                          <span className="text-xs text-gray-500">
                            {session.pace}
                          </span>
                        </div>
                      </div>

                      {/* Edit button — visible on hover */}
                      <button
                        onClick={() => openEdit(week.week, session)}
                        className={`shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all ${
                          isHovered ? "opacity-100" : "opacity-0"
                        }`}
                        aria-label={`Rediger ${session.day} uke ${week.week}`}
                        tabIndex={isHovered ? 0 : -1}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-2a2 2 0 01.586-1.414z"
                          />
                        </svg>
                      </button>
                    </div>
                  )}

                  {/* Inline edit form */}
                  {isEditing && editValues && (
                    <div className="px-4 py-4 bg-blue-50 border-l-4 border-blue-400">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-8 text-xs font-semibold text-gray-500">
                          {session.day}
                        </span>
                        <span className="text-sm font-semibold text-blue-800">
                          Rediger økt
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                        {/* Type select */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Type
                          </label>
                          <select
                            value={editValues.type}
                            onChange={(e) =>
                              setEditValues((prev) =>
                                prev ? { ...prev, type: e.target.value } : prev
                              )
                            }
                            className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                          >
                            {SESSION_TYPE_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>
                                {SESSION_ICONS[opt]} {opt}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Distance input */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Distanse
                          </label>
                          <input
                            type="text"
                            value={editValues.distance}
                            onChange={(e) =>
                              setEditValues((prev) =>
                                prev
                                  ? { ...prev, distance: e.target.value }
                                  : prev
                              )
                            }
                            placeholder="f.eks. 10 km"
                            className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                          />
                        </div>

                        {/* Pace input */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Tempo / Beskrivelse
                          </label>
                          <input
                            type="text"
                            value={editValues.pace}
                            onChange={(e) =>
                              setEditValues((prev) =>
                                prev
                                  ? { ...prev, pace: e.target.value }
                                  : prev
                              )
                            }
                            placeholder="f.eks. 5:30/km"
                            className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                          />
                        </div>
                      </div>

                      {saveError && (
                        <p className="text-xs text-red-600 mb-2">{saveError}</p>
                      )}

                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleSave}
                          disabled={saving}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                          {saving ? "Lagrer..." : "Lagre"}
                        </button>
                        <button
                          onClick={closeEdit}
                          disabled={saving}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                        >
                          Avbryt
                        </button>
                        {overrides[buildKey(week.week, session.day)] && (
                          <button
                            onClick={() =>
                              handleReset(week.week, session.day)
                            }
                            disabled={saving}
                            className="text-xs font-medium px-3 py-1.5 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors ml-auto"
                          >
                            Tilbakestill til original
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
