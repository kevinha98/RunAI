import DashboardSidebar from "../DashboardSidebar";
import { readUserStats } from "@/lib/stats-store";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { formatPace } from "@/lib/strava-types";
import type { StravaActivity } from "@/lib/strava-types";
import { TrendingUp, Activity, Zap } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Fremgang" };

// --- Compute weekly km from activity list -----------------------------------

interface WeekBucket {
  label: string;
  km: number;
  runs: number;
}

function getWeeklyBuckets(runs: StravaActivity[]): WeekBucket[] {
  const buckets: WeekBucket[] = [];
  const now = new Date();

  for (let i = 7; i >= 0; i--) {
    // Week ending on Saturday of i weeks ago
    const anchor = new Date(now);
    anchor.setDate(now.getDate() - i * 7);

    // Find Monday (start) and Sunday (end) of that week
    const dayOfWeek = anchor.getDay(); // 0=Sun
    const monday = new Date(anchor);
    monday.setDate(anchor.getDate() - ((dayOfWeek + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const weekRuns = runs.filter((r) => {
      const d = new Date(r.start_date_local);
      return d >= monday && d <= sunday;
    });

    const km = weekRuns.reduce((sum, r) => sum + r.distance / 1000, 0);

    buckets.push({
      label:
        i === 0
          ? "Denne"
          : monday.toLocaleDateString("nb-NO", { day: "numeric", month: "short" }),
      km: Math.round(km * 10) / 10,
      runs: weekRuns.length,
    });
  }

  return buckets;
}

function getPaceTrend(runs: StravaActivity[]): { date: string; pace: string }[] {
  return runs
    .filter((r) => r.distance > 1000 && r.moving_time > 0)
    .slice(0, 10)
    .reverse()
    .map((r) => ({
      date: new Date(r.start_date_local).toLocaleDateString("nb-NO", {
        day: "numeric",
        month: "short",
      }),
      pace: formatPace(r.moving_time / (r.distance / 1000)),
    }));
}

export default async function ProgressPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const stats = await readUserStats(user.id);
  const { athlete, computed, recentRuns } = stats;
  const hasData = athlete !== null || recentRuns.length > 0;

  const weeklyBuckets = getWeeklyBuckets(recentRuns);
  const maxKm = Math.max(...weeklyBuckets.map((b) => b.km), 1);
  const paceTrend = getPaceTrend(recentRuns);

  return (
    <div className="min-h-screen bg-[#F5F5F3] text-[#111110] flex">
      <DashboardSidebar stats={stats} activePath="/dashboard/progress" />

      <div className="flex-1 ml-60 p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2.5">
            <TrendingUp size={22} className="text-[#FC5200]" />
            Fremgang
          </h1>
          <p className="text-[#6B6B65] text-sm mt-1">
            {hasData ? "Basert på Strava-data" : "Koble Strava for å se fremgang"}
          </p>
        </div>

        {!hasData ? (
          /* No Strava data */
          <div className="bg-white border border-[#E5E5E2] rounded-2xl p-8 text-center max-w-md mx-auto">
            <div className="text-4xl mb-4">📊</div>
            <h2 className="font-bold text-lg mb-2">Ingen data ennå</h2>
            <p className="text-sm text-[#6B6B65] mb-6">
              Koble Strava for å se ukentlig km, fartstrend og løpshistorikk.
            </p>
            <a
              href="/api/strava/connect"
              className="inline-flex items-center gap-2 bg-[#FC5200] text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-[#E04800] transition-colors"
            >
              Koble til Strava
            </a>
          </div>
        ) : (
          <>
            {/* Key stats */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              {[
                {
                  label: "Ukentlig km",
                  value: computed.weeklyKm.toFixed(1),
                  unit: "km",
                  sub: `${computed.weeklyRuns} økt${computed.weeklyRuns !== 1 ? "er" : ""} denne uken`,
                  icon: Activity,
                },
                {
                  label: "Hittil i år",
                  value: computed.ytdKm.toFixed(0),
                  unit: "km",
                  sub: `${computed.totalRunsAllTime} løp totalt`,
                  icon: TrendingUp,
                },
                {
                  label: "Snittfart",
                  value: formatPace(computed.avgPaceSecPerKm),
                  unit: "/km",
                  sub: "Siste 5 løp",
                  icon: Zap,
                },
                {
                  label: "Lengste (30d)",
                  value: computed.longestRunKm.toFixed(1),
                  unit: "km",
                  sub: "Siste 30 dager",
                  icon: Activity,
                },
              ].map((m) => (
                <div
                  key={m.label}
                  className="bg-white border border-[#E5E5E2] rounded-2xl p-5"
                >
                  <div className="text-xs text-[#6B6B65] mb-2 font-medium">{m.label}</div>
                  <div className="flex items-end gap-1 mb-1">
                    <span className="text-2xl font-black tracking-tight">{m.value}</span>
                    <span className="text-xs text-[#6B6B65] mb-1">{m.unit}</span>
                  </div>
                  <div className="text-xs text-[#6B6B65]">{m.sub}</div>
                </div>
              ))}
            </div>

            {/* Weekly km bar chart */}
            <div className="bg-white border border-[#E5E5E2] rounded-2xl p-6 mb-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold">Ukentlig km — siste 8 uker</h3>
                <span className="text-xs text-[#6B6B65]">Fra Strava</span>
              </div>
              <div className="flex items-end gap-2 h-36">
                {weeklyBuckets.map((b, i) => {
                  const h = maxKm > 0 ? Math.round((b.km / maxKm) * 100) : 0;
                  const isCurrent = i === weeklyBuckets.length - 1;
                  return (
                    <div key={b.label} className="flex-1 flex flex-col items-center gap-1.5">
                      <span className="text-xs font-semibold text-[#6B6B65]">
                        {b.km > 0 ? `${b.km}` : ""}
                      </span>
                      <div
                        className={`w-full rounded-sm transition-all ${
                          isCurrent ? "bg-[#FC5200]" : "bg-[#E5E5E2]"
                        }`}
                        style={{ height: `${Math.max(h, b.km > 0 ? 4 : 0)}%` }}
                      />
                      <span className="text-[10px] text-[#6B6B65] text-center leading-tight">
                        {b.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pace trend + recent runs */}
            <div className="grid grid-cols-2 gap-6">
              {/* Pace trend */}
              {paceTrend.length > 0 && (
                <div className="bg-white border border-[#E5E5E2] rounded-2xl p-6">
                  <h3 className="font-bold mb-4">Fartstrend</h3>
                  <div className="space-y-2">
                    {paceTrend.map((p, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-[#6B6B65] text-xs">{p.date}</span>
                        <span className="font-semibold tabular-nums">{p.pace}/km</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent runs */}
              <div className="bg-white border border-[#E5E5E2] rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold">Siste løp</h3>
                  <span className="text-xs text-[#6B6B65]">{recentRuns.length} totalt</span>
                </div>
                <div className="space-y-2.5">
                  {recentRuns.slice(0, 8).map((run) => {
                    const km = (run.distance / 1000).toFixed(1);
                    const pace = formatPace(run.moving_time / (run.distance / 1000));
                    const date = new Date(run.start_date_local).toLocaleDateString("nb-NO", {
                      day: "numeric",
                      month: "short",
                    });
                    return (
                      <div
                        key={run.id}
                        className="flex items-center gap-3 text-sm"
                      >
                        <span className="text-xs text-[#6B6B65] w-14 shrink-0">{date}</span>
                        <div className="flex-1 min-w-0">
                          <div className="truncate font-medium text-sm">{run.name}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-semibold text-sm">{km} km</div>
                          <div className="text-xs text-[#6B6B65]">{pace}/km</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
