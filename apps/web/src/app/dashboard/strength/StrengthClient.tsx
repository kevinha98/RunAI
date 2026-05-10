"use client";

import { useState, useEffect, useRef } from "react";
import { Zap, RotateCcw, Plus, Trash2, Pencil } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Exercise {
  id: string;
  name: string;
  sets: string;
  reps: string;
  note: string;
}

interface Session {
  id: string;
  title: string;
  duration: string;
  icon: string;
  focus: string;
  exercises: Exercise[];
}

// ─── Default data ─────────────────────────────────────────────────────────────

const DEFAULT_SESSIONS: Session[] = [
  {
    id: "core",
    title: "Kjerneaktivering",
    duration: "15 min",
    icon: "🎯",
    focus: "Stabilitet og holdning for løping",
    exercises: [
      { id: "c1", name: "Glute bridge", sets: "3", reps: "15", note: "Press hoften rett opp, hold 2 sek" },
      { id: "c2", name: "Dead bug", sets: "3", reps: "10/side", note: "Korsryggen mot gulvet hele veien" },
      { id: "c3", name: "Planke", sets: "3", reps: "45 sek", note: "Rett linje fra hode til hæl" },
      { id: "c4", name: "Sideplanke", sets: "2", reps: "30 sek/side", note: "Hofte oppe, ikke synke" },
      { id: "c5", name: "Bird dog", sets: "3", reps: "8/side", note: "Langsom og kontrollert bevegelse" },
    ],
  },
  {
    id: "legs",
    title: "Bein og hofte",
    duration: "20 min",
    icon: "💚",
    focus: "Kraft for fraspark og stigningsarbeid",
    exercises: [
      { id: "l1", name: "Enbens kniebøy", sets: "3", reps: "10/side", note: "Kne over tå, kontrollert ned" },
      { id: "l2", name: "Nordic hamstring curl", sets: "3", reps: "8", note: "Ekstremt effektivt mot hamstring-skader" },
      { id: "l3", name: "Hip thrust", sets: "3", reps: "15", note: "Vektbelastet gir best effekt" },
      { id: "l4", name: "Lateral band walk", sets: "3", reps: "15/side", note: "Aktiverer gluteus medius" },
      { id: "l5", name: "Calf raise", sets: "3", reps: "20", note: "Hæver føtter og styrker åre" },
    ],
  },
  {
    id: "mobility",
    title: "Dynamisk mobilitet",
    duration: "10 min",
    icon: "🧘",
    focus: "Bevegelighet og skadeforebygging",
    exercises: [
      { id: "m1", name: "Leggsveis (leg swing)", sets: "2", reps: "15/side", note: "Frem og tilbake, så side til side" },
      { id: "m2", name: "Hip flexor tøying", sets: "2", reps: "45 sek/side", note: "Kne mot gulvet, foroverlent hofte" },
      { id: "m3", name: "Skrittåpner (lunge med rotasjon)", sets: "2", reps: "8/side", note: "Roter mot forbæret" },
      { id: "m4", name: "Ankel-sirkler", sets: "2", reps: "10/side", note: "Roer ankelmobilitet for løping" },
      { id: "m5", name: "Pigeon stretch", sets: "2", reps: "60 sek/side", note: "Dyp hoftebøyer-tøying" },
    ],
  },
  {
    id: "specific",
    title: "Løpsspesifikke øvelser",
    duration: "12 min",
    icon: "⚡",
    focus: "Nevromuskulær effektivitet og teknikk",
    exercises: [
      { id: "s1", name: "A-skip", sets: "3", reps: "20 m", note: "Knær opp, armarbeid rytmisk" },
      { id: "s2", name: "B-skip", sets: "3", reps: "20 m", note: "Kne opp + strekk i luften" },
      { id: "s3", name: "Ankeldrive", sets: "3", reps: "20 m", note: "Rask, lav kontakt med bakken" },
      { id: "s4", name: "Strider (bakke-fart)", sets: "4", reps: "80 m", note: "85–90% av maks, avslappet form" },
      { id: "s5", name: "Stridende hoppserie", sets: "3", reps: "10", note: "Fjærende avgang, soft landing" },
    ],
  },
];

const WEEKLY_PLAN = [
  { day: "Man", session: "Kjerneaktivering", after: "Etter morgenløpet" },
  { day: "Tir", session: "Bein og hofte", after: "Etter terskeløkten" },
  { day: "Ons", session: "— Hvile", after: "Fokus på løping" },
  { day: "Tor", session: "Dynamisk mobilitet", after: "Som oppvarming" },
  { day: "Fre", session: "Løpsspesifikke", after: "Før lett løp" },
  { day: "Lør", session: "— Hvile", after: "Langkjøringsdag" },
  { day: "Søn", session: "— Hvile", after: "Full restitusjon" },
];

const STORAGE_KEY = "runai-strength-sessions-v2";

// ─── Inline editable field ────────────────────────────────────────────────────

function EditableField({
  value,
  onChange,
  className = "",
  multiline = false,
  placeholder = "",
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  multiline?: boolean;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(value);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [editing, value]);

  const commit = () => {
    onChange(draft.trim() || value);
    setEditing(false);
  };

  if (editing) {
    const sharedClass = `border border-[#FC5200] rounded px-1.5 py-0.5 outline-none bg-orange-50 w-full text-[#111110] ${className}`;
    if (multiline) {
      return (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          className={`${sharedClass} resize-none`}
          value={draft}
          rows={2}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === "Escape") setEditing(false); }}
        />
      );
    }
    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        className={sharedClass}
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setEditing(false);
        }}
      />
    );
  }

  return (
    <span
      className={`cursor-pointer group inline-flex items-center gap-1 hover:text-[#FC5200] transition-colors rounded px-0.5 -mx-0.5 ${className}`}
      onClick={() => setEditing(true)}
      title="Klikk for å redigere"
    >
      <span>{value || <span className="text-[#C8C8C4] italic">{placeholder}</span>}</span>
      <Pencil size={9} className="shrink-0 opacity-0 group-hover:opacity-40 transition-opacity" />
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function StrengthClient() {
  const [sessions, setSessions] = useState<Session[]>(DEFAULT_SESSIONS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Session[];
        if (Array.isArray(parsed) && parsed.length > 0) setSessions(parsed);
      }
    } catch { /* ignore */ }
    setIsLoaded(true);
  }, []);

  // Persist to localStorage whenever sessions change (after initial load)
  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  }, [sessions, isLoaded]);

  const updateSession = (sessionId: string, field: keyof Session, value: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, [field]: value } : s))
    );
  };

  const updateExercise = (sessionId: string, exId: string, field: keyof Exercise, value: string) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? { ...s, exercises: s.exercises.map((ex) => (ex.id === exId ? { ...ex, [field]: value } : ex)) }
          : s
      )
    );
  };

  const addExercise = (sessionId: string) => {
    const id = `custom-${Date.now()}`;
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? { ...s, exercises: [...s.exercises, { id, name: "Ny øvelse", sets: "3", reps: "10", note: "Beskriv teknikk..." }] }
          : s
      )
    );
  };

  const deleteExercise = (sessionId: string, exId: string) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? { ...s, exercises: s.exercises.filter((ex) => ex.id !== exId) }
          : s
      )
    );
  };

  const resetToDefaults = () => {
    if (confirm("Tilbakestille alle øvelser til standard?")) {
      localStorage.removeItem(STORAGE_KEY);
      setSessions(DEFAULT_SESSIONS);
    }
  };

  return (
    <div className="flex-1 md:ml-60 p-4 md:p-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2.5">
            <Zap size={22} className="text-[#FC5200]" />
            Styrketrening
          </h1>
          <p className="text-[#6B6B65] text-sm mt-1">
            Klikk på et felt for å redigere — endringer lagres automatisk
          </p>
        </div>
        <button
          onClick={resetToDefaults}
          className="flex items-center gap-1.5 text-xs text-[#6B6B65] hover:text-[#111110] transition-colors px-3 py-2 rounded-xl border border-[#E5E5E2] hover:border-[#C8C8C4] bg-white"
        >
          <RotateCcw size={12} />
          Tilbakestill
        </button>
      </div>

      {/* Weekly plan strip */}
      <div className="bg-white border border-[#E5E5E2] rounded-2xl p-5 mb-8">
        <h3 className="font-bold text-sm mb-4">Ukentlig styrkeplan</h3>
        <div className="grid grid-cols-7 gap-1">
          {WEEKLY_PLAN.map((d) => (
            <div key={d.day} className="text-center">
              <div className="text-[10px] font-bold text-[#6B6B65] mb-1.5">{d.day}</div>
              <div
                className={`text-[10px] leading-tight rounded-lg p-1.5 ${
                  d.session.startsWith("—")
                    ? "text-[#C8C8C4]"
                    : "text-[#FC5200] bg-[rgba(252,82,0,0.08)] font-semibold"
                }`}
              >
                {d.session.startsWith("—") ? "Hvile" : d.session.split(" ")[0]}
              </div>
              <div className="text-[9px] text-[#C8C8C4] mt-1 leading-tight">{d.after}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Sessions grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {sessions.map((session) => (
          <div key={session.id} className="bg-white border border-[#E5E5E2] rounded-2xl overflow-hidden">
            {/* Session header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E5E2] bg-[#FAFAF8]">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-xl shrink-0">{session.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm">
                    <EditableField
                      value={session.title}
                      onChange={(v) => updateSession(session.id, "title", v)}
                      className="font-bold text-sm"
                    />
                  </div>
                  <div className="text-xs text-[#6B6B65] mt-0.5">
                    <EditableField
                      value={session.focus}
                      onChange={(v) => updateSession(session.id, "focus", v)}
                      className="text-xs text-[#6B6B65]"
                    />
                  </div>
                </div>
              </div>
              <span className="text-xs text-[#6B6B65] bg-[#F2F2F0] px-2.5 py-1 rounded-lg font-semibold shrink-0 ml-2">
                <EditableField
                  value={session.duration}
                  onChange={(v) => updateSession(session.id, "duration", v)}
                  className="text-xs"
                />
              </span>
            </div>

            {/* Exercise list */}
            <div className="divide-y divide-[#F2F2F0]">
              {session.exercises.map((ex) => (
                <div key={ex.id} className="px-5 py-3 flex items-start gap-3 group/row hover:bg-[#FAFAF8] transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold">
                      <EditableField
                        value={ex.name}
                        onChange={(v) => updateExercise(session.id, ex.id, "name", v)}
                        className="text-sm font-semibold"
                      />
                    </div>
                    <div className="text-xs text-[#6B6B65] mt-0.5">
                      <EditableField
                        value={ex.note}
                        onChange={(v) => updateExercise(session.id, ex.id, "note", v)}
                        className="text-xs text-[#6B6B65]"
                        multiline
                        placeholder="Legg til notat..."
                      />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold text-[#FC5200]">
                      <EditableField
                        value={ex.sets}
                        onChange={(v) => updateExercise(session.id, ex.id, "sets", v)}
                        className="text-xs font-bold text-[#FC5200]"
                      />
                      {" sett"}
                    </div>
                    <div className="text-xs text-[#6B6B65]">
                      <EditableField
                        value={ex.reps}
                        onChange={(v) => updateExercise(session.id, ex.id, "reps", v)}
                        className="text-xs text-[#6B6B65]"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => deleteExercise(session.id, ex.id)}
                    className="opacity-0 group-hover/row:opacity-100 transition-opacity shrink-0 mt-0.5 p-1 rounded hover:bg-red-50 hover:text-red-400 text-[#C8C8C4]"
                    title="Slett øvelse"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>

            {/* Add exercise button */}
            <button
              onClick={() => addExercise(session.id)}
              className="w-full flex items-center justify-center gap-2 py-3 text-xs text-[#6B6B65] hover:text-[#FC5200] hover:bg-[rgba(252,82,0,0.04)] transition-colors border-t border-[#F2F2F0]"
            >
              <Plus size={12} />
              Legg til øvelse
            </button>
          </div>
        ))}
      </div>

      {/* Tips */}
      <div className="mt-8 grid md:grid-cols-3 gap-4">
        {[
          { icon: "⏰", title: "Når?", desc: "Gjør styrke etter løping, aldri før lengre økter. Unngå tung styrke dagen før terskeløkt." },
          { icon: "📈", title: "Progresjon", desc: "Start lett, bygg opp over 4–6 uker. 2 styrkeøkter per uke er optimal for løpere." },
          { icon: "💤", title: "Restitusjon", desc: "Styrketrening bryter ned muskel. Restitusjon og søvn er der du faktisk blir sterkere." },
        ].map((tip) => (
          <div key={tip.title} className="bg-white border border-[#E5E5E2] rounded-xl p-4">
            <div className="text-xl mb-2">{tip.icon}</div>
            <div className="text-sm font-bold mb-1">{tip.title}</div>
            <div className="text-xs text-[#6B6B65] leading-relaxed">{tip.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
