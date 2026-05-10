"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { RACE_DATE, PLAN_START, TOTAL_WEEKS } from "@/lib/plan-data";
import type { StravaAthlete } from "@/lib/strava-types";

interface Props {
  user: { email: string | null; name: string | null; avatar: string | null };
  stravaConnected: boolean;
  stravaAthlete: StravaAthlete | null;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#E5E5E2] rounded-2xl p-5 mb-4">
      <h2 className="text-sm font-bold text-[#111110] mb-4">{title}</h2>
      {children}
    </div>
  );
}

function Row({ label, value, action }: { label: string; value?: string | null; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[#F0F0EE] last:border-0">
      <div>
        <p className="text-xs font-medium text-[#6B6B65]">{label}</p>
        {value && <p className="text-sm text-[#111110] mt-0.5">{value}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

export default function SettingsClient({ user, stravaConnected, stravaAthlete }: Props) {
  const [disconnecting, setDisconnecting] = useState(false);
  const [disconnectMsg, setDisconnectMsg] = useState<string | null>(null);

  const daysLeft = Math.max(0, Math.ceil((RACE_DATE.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  const raceDateStr = RACE_DATE.toLocaleDateString("nb-NO", { day: "numeric", month: "long", year: "numeric" });
  const planStartStr = PLAN_START.toLocaleDateString("nb-NO", { day: "numeric", month: "long", year: "numeric" });

  async function handleDisconnectStrava() {
    if (!confirm("Er du sikker?")) return;
    setDisconnecting(true);
    try {
      const res = await fetch("/api/strava/disconnect", { method: "POST" });
      setDisconnectMsg(res.ok ? "Strava frakoblet." : "Feil. Prøv igjen.");
      if (res.ok) window.location.reload();
    } catch { setDisconnectMsg("Nettverksfeil."); }
    finally { setDisconnecting(false); }
  }

  return (
    <div>
      <Section title="Profil">
        <div className="flex items-center gap-4 mb-4 pb-4 border-b border-[#F0F0EE]">
          {user.avatar ? (
            <Image src={user.avatar} alt={user.name ?? "Bruker"} width={56} height={56} className="w-14 h-14 rounded-full object-cover" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-[#FC5200] flex items-center justify-center text-white font-bold text-xl">
              {user.name ? user.name[0].toUpperCase() : "?"}
            </div>
          )}
          <div>
            <p className="font-semibold text-[#111110]">{user.name ?? "Ukjent bruker"}</p>
            <p className="text-sm text-[#6B6B65]">{user.email ?? ""}</p>
          </div>
        </div>
        <Row label="Innloggingsmetode" value="Google" />
        <Row label="Logg ut" action={
          <form action="/auth/signout" method="POST">
            <button type="submit" className="text-xs font-semibold text-red-500 hover:text-red-700 transition-colors">Logg ut</button>
          </form>
        } />
      </Section>

      <Section title="Strava-tilkobling">
        {stravaConnected && stravaAthlete ? (
          <>
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-[#F0F0EE]">
              <div className="w-10 h-10 rounded-full bg-[#F5F5F3] flex items-center justify-center text-xl">🏃</div>
              <div>
                <p className="font-semibold text-[#111110]">{stravaAthlete.firstname} {stravaAthlete.lastname}</p>
              </div>
              <span className="ml-auto text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">✓ Tilkoblet</span>
            </div>
            <Row label="Koble fra Strava" action={
              <button onClick={handleDisconnectStrava} disabled={disconnecting}
                className="text-xs font-semibold text-red-500 hover:text-red-700 disabled:opacity-50 transition-colors">
                {disconnecting ? "Frakobler…" : "Koble fra"}
              </button>
            } />
            {disconnectMsg && <p className="text-xs text-red-500 mt-2">{disconnectMsg}</p>}
          </>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#6B6B65]">Ingen Strava-konto tilkoblet</p>
            <a href="/api/strava/connect" className="text-xs font-semibold text-[#FC5200] border border-[rgba(252,82,0,0.35)] px-3 py-1.5 rounded-xl hover:bg-[rgba(252,82,0,0.07)] transition-colors">
              Koble til Strava
            </a>
          </div>
        )}
      </Section>

      <Section title="Treningsplan">
        <Row label="Løp" value="Bergen City Marathon" />
        <Row label="Dato" value={raceDateStr} />
        <Row label="Dager igjen" value={`${daysLeft} dager`} />
        <Row label="Planstart" value={planStartStr} />
        <Row label="Totalt antall uker" value={`${TOTAL_WEEKS} uker`} />
        <Row label="Se full plan" action={<Link href="/dashboard/plan" className="text-xs font-semibold text-[#FC5200] hover:underline">Åpne plan →</Link>} />
      </Section>

      <Section title="Data og personvern">
        <Row label="Treningsdata" value="Lagret via Strava API" />
        <Row label="AI-analyse" value="Anthropic Claude via sikker gateway" />
        <Row label="Ukerapporter" value="Supabase database med RLS-sikkerhet" />
      </Section>

      <div className="bg-[#F0F0EE] rounded-xl px-4 py-3 text-[10px] text-[#9B9B95] text-center">
        RunAI v0.1 — Bergen City Marathon 24. april 2027
      </div>
    </div>
  );
}