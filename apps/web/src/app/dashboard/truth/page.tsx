"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  RefreshCw,
  Save,
  Pencil,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
} from "lucide-react";
import { InfoPopup, StorageBadge } from "@/components/InfoPopup";

interface ProfileData {
  llmContent: string;
  userContent: string | null;
  generatedAt: string | null;
  activeContent: string;
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("nb-NO", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function TruthPage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [showLlmVersion, setShowLlmVersion] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fiveKSeconds =
    typeof window !== "undefined"
      ? (() => {
          const raw = localStorage.getItem("runai-5k-pr");
          const n = raw ? parseInt(raw, 10) : NaN;
          return isNaN(n) ? undefined : n;
        })()
      : undefined;

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d: ProfileData) => setProfile(d))
      .catch(() => setProfile({ llmContent: "", userContent: null, generatedAt: null, activeContent: "" }))
      .finally(() => setLoading(false));
  }, []);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  function startEdit() {
    setDraft(profile?.activeContent ?? "");
    setEditing(true);
    setTimeout(() => textareaRef.current?.focus(), 50);
  }

  function cancelEdit() {
    setEditing(false);
    setDraft("");
  }

  async function handleSave() {
    if (!draft.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userContent: draft.trim() }),
      });
      if (!res.ok) throw new Error();
      const updated: ProfileData = await res.json();
      setProfile(updated);
      setEditing(false);
      showToast("Profilen er lagret", true);
    } catch {
      showToast("Kunne ikke lagre — prøv igjen", false);
    } finally {
      setSaving(false);
    }
  }

  async function handleRevert() {
    if (!confirm("Tilbakestill til AI-versjonen? Din tekst vil slettes.")) return;
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userContent: "" }),
      });
      if (!res.ok) throw new Error();
      const updated: ProfileData = await res.json();
      setProfile(updated);
      setEditing(false);
      showToast("Tilbakestilt til AI-versjonen", true);
    } catch {
      showToast("Noe gikk galt", false);
    } finally {
      setSaving(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const res = await fetch("/api/profile/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fiveKSeconds }),
      });
      if (!res.ok) throw new Error();

      // Re-fetch the updated profile
      const profileRes = await fetch("/api/profile");
      const updated: ProfileData = await profileRes.json();
      setProfile(updated);
      showToast("AI-profilen er oppdatert", true);
    } catch {
      showToast("Klarte ikke oppdatere — prøv igjen", false);
    } finally {
      setRefreshing(false);
    }
  }

  const isUserEdited = !!profile?.userContent;
  const isEmpty = !profile?.activeContent?.trim();

  return (
    <main className="flex-1 min-h-screen overflow-y-auto bg-[#FAFAF9] p-6 max-w-3xl mx-auto">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white transition-all ${
            toast.ok ? "bg-emerald-600" : "bg-red-600"
          }`}
        >
          {toast.ok ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
          {toast.msg}
        </div>
      )}

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
            <User size={18} className="text-[#FC5200]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#111110] flex items-center gap-2">
              Treningsprofil
              <InfoPopup>
                <strong className="block mb-1">Treningsprofil — «The Hard Truth»</strong>
                <p className="mb-1">AI-en analyserer all tilgjengelig data (Strava, ukerapporter, treningstid) og skriver en ærlig profil av Hildes form, styrker og svakheter.</p>
                <p className="mb-1">Du kan redigere teksten fritt. Din versjon brukes i alle fremtidige AI-samtaler.</p>
                <p className="mb-2">Profilen oppdateres automatisk etter Strava-synk og etter ukerapporter.</p>
                <StorageBadge type="supabase" />
              </InfoPopup>
            </h1>
            <p className="text-xs text-[#6B6B65] mt-0.5">
              Hva AI-en vet om Hildes form — kan redigeres og overstyres
            </p>
          </div>
        </div>
      </div>

      {/* Profile card */}
      <section className="bg-white border border-[#E5E5E2] rounded-2xl overflow-hidden mb-6">
        {/* Card header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E5E5E2] bg-[#FAFAF9]">
          <div className="flex items-center gap-2">
            {isUserEdited ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-0.5">
                <Pencil size={9} />
                Redigert av deg
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#6B6B65] bg-[#F0F0EE] rounded-full px-2.5 py-0.5">
                AI-generert
              </span>
            )}
            {profile?.generatedAt && (
              <span className="text-[10px] text-[#9B9B95]">
                oppdatert {formatDate(profile.generatedAt)}
              </span>
            )}
          </div>

          {/* Action buttons */}
          {!editing && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                title="Regenerer med AI"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E5E2] text-xs font-medium text-[#6B6B65] hover:border-[#FC5200] hover:text-[#FC5200] transition-colors disabled:opacity-40"
              >
                {refreshing ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : (
                  <RefreshCw size={11} />
                )}
                {refreshing ? "Analyserer…" : "Regenerer"}
              </button>
              <button
                onClick={startEdit}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E5E2] text-xs font-medium text-[#6B6B65] hover:border-[#FC5200] hover:text-[#FC5200] transition-colors"
              >
                <Pencil size={11} />
                Rediger
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="px-5 py-5">
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-[#9B9B95] py-6">
              <Loader2 size={14} className="animate-spin" />
              Laster profil…
            </div>
          ) : editing ? (
            <div className="space-y-3">
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={16}
                className="w-full resize-none rounded-xl border border-[#E5E5E2] bg-[#FAFAF9] px-4 py-3 text-sm text-[#111110] focus:outline-none focus:ring-2 focus:ring-[#FC5200] focus:ring-opacity-30 leading-relaxed transition-all"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving || !draft.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FC5200] text-white text-xs font-bold disabled:opacity-40 hover:bg-[#e54b00] transition-colors"
                >
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                  Lagre
                </button>
                <button
                  onClick={cancelEdit}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#E5E5E2] text-xs font-medium text-[#6B6B65] hover:border-[#9B9B95] transition-colors"
                >
                  <X size={12} />
                  Avbryt
                </button>
                {isUserEdited && (
                  <button
                    onClick={handleRevert}
                    disabled={saving}
                    className="ml-auto inline-flex items-center gap-1.5 text-xs text-[#9B9B95] hover:text-red-500 transition-colors"
                  >
                    <RefreshCw size={11} />
                    Tilbakestill til AI
                  </button>
                )}
              </div>
            </div>
          ) : isEmpty ? (
            <div className="text-center py-8">
              <p className="text-sm text-[#9B9B95]">Ingen profil ennå.</p>
              <p className="text-xs text-[#C8C8C4] mt-1 mb-4">
                Klikk «Regenerer» for å la AI-en lage din første treningsprofil.
              </p>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FC5200] text-white text-xs font-bold hover:bg-[#e54b00] transition-colors"
              >
                {refreshing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                {refreshing ? "Analyserer…" : "Generer profil nå"}
              </button>
            </div>
          ) : (
            <div>
              <p className="text-sm text-[#111110] leading-relaxed whitespace-pre-wrap">
                {profile?.activeContent}
              </p>

              {/* Show AI version toggle when user has edited */}
              {isUserEdited && profile?.llmContent && (
                <div className="mt-5 border-t border-[#E5E5E2] pt-4">
                  <button
                    onClick={() => setShowLlmVersion((v) => !v)}
                    className="inline-flex items-center gap-1.5 text-xs text-[#9B9B95] hover:text-[#6B6B65] transition-colors"
                  >
                    <Eye size={11} />
                    {showLlmVersion ? "Skjul AI-versjon" : "Se hva AI sier"}
                  </button>
                  {showLlmVersion && (
                    <div className="mt-3 p-4 bg-[#FAFAF9] rounded-xl border border-dashed border-[#E5E5E2]">
                      <p className="text-[10px] font-semibold text-[#9B9B95] uppercase tracking-wide mb-2">
                        AI-versjon (ikke aktiv)
                      </p>
                      <p className="text-xs text-[#6B6B65] leading-relaxed whitespace-pre-wrap">
                        {profile.llmContent}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Info box */}
      <div className="bg-white border border-[#E5E5E2] rounded-2xl p-5">
        <p className="text-xs font-semibold text-[#111110] mb-2">Slik brukes profilen</p>
        <ul className="space-y-1.5 text-xs text-[#6B6B65]">
          <li>• Profilen injiseres automatisk i alle AI-samtaler (coach, ukegenerering, ukerapport)</li>
          <li>• Oppdateres automatisk etter Strava-synk og etter innsendte ukerapporter</li>
          <li>• Din redigerte versjon overstyrer alltid AI-versjonen</li>
          <li>• Endre gjerne tone, legg til kontekst AI ikke vet, eller korriger feil påstander</li>
        </ul>
      </div>
    </main>
  );
}
