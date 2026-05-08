import Link from "next/link";
import Image from "next/image";
import { Activity, Calendar, Brain, TrendingUp, Zap, RefreshCw } from "lucide-react";
import type { StoredStats } from "@/lib/strava-types";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/SignOutButton";

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

export default async function DashboardSidebar({ stats, activePath }: Props) {
  const { athlete, lastSync } = stats;
  const isStravaLinked = athlete !== null;

  // Get the signed-in Google user from Supabase
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const googleName = user?.user_metadata?.full_name as string | undefined;
  const googleAvatar = user?.user_metadata?.avatar_url as string | undefined;
  const displayName = googleName ?? athlete?.firstname ?? null;
  const displayEmail = user?.email ?? null;

  return (
    <div className="hidden md:flex fixed left-0 top-0 bottom-0 w-60 border-r border-[#E5E5E2] bg-white flex-col p-5 z-40">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 mb-8">
        <div className="w-7 h-7 bg-[#FC5200] rounded-lg flex items-center justify-center">
          <span className="text-white font-black text-xs">R</span>
        </div>
        <span className="font-bold text-[#111110]">RunAI</span>
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
                  ? "bg-[rgba(252,82,0,0.10)] text-[#FC5200] font-medium"
                  : "text-[#6B6B65] hover:text-[#111110] hover:bg-[#F5F5F3]"
              }`}
            >
              <Icon size={15} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Strava + user */}
      <div className="border-t border-[#E5E5E2] pt-4">
        {isStravaLinked ? (
          <div className="px-3 py-2.5 mb-3 rounded-xl bg-[rgba(252,82,0,0.07)] border border-[rgba(252,82,0,0.18)]">
            <div className="flex items-center gap-2 mb-1">
              <StravaIcon />
              <span className="text-xs text-[#FC5200] font-semibold">Strava tilkoblet</span>
            </div>
            {lastSync && (
              <div className="text-[10px] text-[#6B6B65] pl-6">
                Synk {new Date(lastSync).toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" })}
              </div>
            )}
            <form action="/api/strava/sync" method="POST" className="mt-1.5 pl-6">
              <button
                type="submit"
                className="flex items-center gap-1 text-[10px] text-[#6B6B65] hover:text-[#FC5200] transition-colors"
              >
                <RefreshCw size={9} /> Synkroniser
              </button>
            </form>
          </div>
        ) : (
          <a
            href="/api/strava/connect"
            className="flex items-center gap-2 px-3 py-2.5 mb-3 rounded-xl border border-[rgba(252,82,0,0.25)] hover:bg-[rgba(252,82,0,0.07)] transition-colors group"
          >
            <StravaIcon />
            <span className="text-xs text-[#FC5200] font-semibold group-hover:underline">
              Koble til Strava
            </span>
          </a>
        )}

        <div className="flex items-center gap-3 px-3">
          {googleAvatar ? (
            <Image
              src={googleAvatar}
              alt={displayName ?? "User avatar"}
              width={32}
              height={32}
              className="w-8 h-8 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="w-8 h-8 bg-[#FC5200] rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
              {displayName ? displayName[0].toUpperCase() : "?"}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-[#111110] truncate">
              {displayName ?? "Bruker"}
            </div>
            {displayEmail && (
              <div className="text-[10px] text-[#6B6B65] truncate">{displayEmail}</div>
            )}
          </div>
        </div>
        <div className="px-3 mt-2">
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
