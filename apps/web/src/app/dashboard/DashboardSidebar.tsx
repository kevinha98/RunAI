import Link from "next/link";
import { Activity, Calendar, Brain, TrendingUp, Zap, RefreshCw } from "lucide-react";
import type { StoredStats } from "@/lib/strava-types";

const STRAVA_ORANGE = "#FC5200";

function StravaIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill={STRAVA_ORANGE}>
      <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
    </svg>
  );
}

const NAV_ITEMS = [
  { icon: Activity, label: "Oversikt", href: "/dashboard" },
  { icon: Calendar, label: "Treningsplan", href: "/dashboard/plan" },
  { icon: Brain, label: "AI-trener", href: "/dashboard/coach" },
  { icon: TrendingUp, label: "Fremgang", href: "/dashboard/progress" },
  { icon: Zap, label: "Styrke", href: "/dashboard/strength" },
];

interface Props {
  stats: StoredStats;
  activePath: string;
}

export default function DashboardSidebar({ stats, activePath }: Props) {
  const { athlete, lastSync } = stats;
  const athleteName = athlete?.firstname ?? null;
  const isStravaLinked = athlete !== null;

  return (
    <div className="fixed left-0 top-0 bottom-0 w-60 border-r border-[#2E2E29] bg-[#111110] flex flex-col p-5 z-40">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 mb-8">
        <div className="w-7 h-7 bg-[#FC5200] rounded-lg flex items-center justify-center">
          <span className="text-white font-black text-xs">R</span>
        </div>
        <span className="font-bold text-[#F2F2F0]">RunAI</span>
      </Link>

      {/* Nav */}
      <nav className="space-y-0.5 flex-1">
        {NAV_ITEMS.map(({ icon: Icon, label, href }) => {
          const isActive = activePath === href;
          return (
            <Link
              key={label}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                isActive
                  ? "bg-[rgba(252,82,0,0.12)] text-[#FC5200] font-medium"
                  : "text-[#9A9A92] hover:text-[#F2F2F0] hover:bg-[#1A1A17]"
              }`}
            >
              <Icon size={15} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Strava + user */}
      <div className="border-t border-[#2E2E29] pt-4">
        {isStravaLinked ? (
          <div className="px-3 py-2.5 mb-3 rounded-xl bg-[rgba(252,82,0,0.08)] border border-[rgba(252,82,0,0.20)]">
            <div className="flex items-center gap-2 mb-1">
              <StravaIcon />
              <span className="text-xs text-[#FC5200] font-semibold">Strava tilkoblet</span>
            </div>
            {lastSync && (
              <div className="text-[10px] text-[#5A5A54] pl-6">
                Synk {new Date(lastSync).toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" })}
              </div>
            )}
            <form action="/api/strava/sync" method="POST" className="mt-1.5 pl-6">
              <button
                type="submit"
                className="flex items-center gap-1 text-[10px] text-[#5A5A54] hover:text-[#FC5200] transition-colors"
              >
                <RefreshCw size={9} /> Synkroniser
              </button>
            </form>
          </div>
        ) : (
          <a
            href="/api/strava/connect"
            className="flex items-center gap-2 px-3 py-2.5 mb-3 rounded-xl border border-[rgba(252,82,0,0.30)] hover:bg-[rgba(252,82,0,0.08)] transition-colors group"
          >
            <StravaIcon />
            <span className="text-xs text-[#FC5200] font-semibold group-hover:underline">
              Koble til Strava
            </span>
          </a>
        )}

        <div className="flex items-center gap-3 px-3">
          <div className="w-8 h-8 bg-[#FC5200] rounded-full flex items-center justify-center text-white font-bold text-sm">
            {athleteName ? athleteName[0].toUpperCase() : "?"}
          </div>
          <div>
            <div className="text-sm font-semibold text-[#F2F2F0]">
              {athleteName ?? "Ikke tilkoblet"}
            </div>
            <div className="text-xs text-[#5A5A54]">RunAI</div>
          </div>
        </div>
      </div>
    </div>
  );
}
