"use client";

import { useState } from "react";
import type { StoredStats, StravaActivity } from "@/lib/strava-types";
import {
  formatPace,
  formatDuration,
  classifyPaceZone,
  computePaceZoneDistribution,
} from "@/lib/strava-types";

interface DashboardClientProps {
  stravaData: StoredStats;
  stravaStatus: string | null;
}

function getActivityPaceSecPerKm(activity: StravaActivity): number {
  if (!activity.distance || !activity.moving_time) return 0;
  return activity.moving_time / (activity.distance / 1000);
}

function PaceZoneBadge({
  activity,
  avgPaceSecPerKm,
}: {
  activity: StravaActivity;
  avgPaceSecPerKm: number;
}) {
  const secPerKm = getActivityPaceSecPerKm(activity);
  const zone = classifyPaceZone(secPerKm, avgPaceSecPerKm);
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${
        zone.bgClass
      } ${zone.textClass} ${zone.borderClass}`}
      title={`Fart: ${formatPace(secPerKm)} /km`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${zone.dotClass}`} />
      {zone.label}
    </span>
  );
}

function ZoneDistributionBar({ runs, avgPaceSecPerKm }: { runs: StravaActivity[]; avgPaceSecPerKm: number }) {
  const distribution = computePaceZoneDistribution(runs, avgPaceSecPerKm, 10);
  const hasData = distribution.some((d) => d.count > 0);

  if (!hasData) return null;

  return (
    <div className="mt-4 p-4 bg-gray-800 rounded-xl border border-gray-700">
      <h3 className="text-sm font-semibold text-gray-300 mb-3">
        Sonefordeling — siste {Math.min(runs.length, 10)} løp
      </h3>
      <div className="space-y-2">
        {distribution.map(({ zone, count, percentage }) => (
          <div key={zone.label} className="flex items-center gap-3">
            <span className={`w-16 text-xs font-medium ${zone.textClass}`}>
              {zone.label}
            </span>
            <div className="flex-1 bg-gray-700 rounded-full h-2 overflow-hidden">
              <div
                className={`h-2 rounded-full ${zone.dotClass} transition-all duration-500`}
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="text-xs text-gray-400 w-14 text-right">
              {count} løp ({percentage}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardClient({
  stravaData,
  stravaStatus,
}: DashboardClientProps) {
  const [activeTab, setActiveTab] = useState<"oversikt" | "løp" | "statistikk">(
    "oversikt"
  );

  const { computed, recentRuns, athlete, stravaStats } = stravaData;
  const avgPace = computed.avgPaceSecPerKm;

  const tabs: { id: "oversikt" | "løp" | "statistikk"; label: string }[] = [
    { id: "oversikt", label: "Oversikt" },
    { id: "løp", label: "Løp" },
    { id: "statistikk", label: "Statistikk" },
  ];

  return (
    <div className="space-y-6">
      {/* Status banner */}
      {stravaStatus && (
        <div className="p-3 bg-blue-900/40 border border-blue-700 rounded-lg text-blue-300 text-sm">
          {stravaStatus}
        </div>
      )}

      {/* Athlete header */}
      {athlete && (
        <div className="flex items-center gap-4 p-4 bg-gray-800 rounded-xl border border-gray-700">
          {athlete.profile && (
            <img
              src={athlete.profile}
              alt={`${athlete.firstname} ${athlete.lastname}`}
              className="w-14 h-14 rounded-full border-2 border-orange-500"
            />
          )}
          <div>
            <h2 className="text-lg font-bold text-white">
              {athlete.firstname} {athlete.lastname}
            </h2>
            {athlete.city && (
              <p className="text-sm text-gray-400">
                {athlete.city}{athlete.country ? `, ${athlete.country}` : ""}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-800 p-1 rounded-xl border border-gray-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-orange-500 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Oversikt tab */}
      {activeTab === "oversikt" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricCard
              label="Km denne uka"
              value={`${computed.weeklyKm.toFixed(1)} km`}
              icon="🏃"
            />
            <MetricCard
              label="Løp denne uka"
              value={`${computed.weeklyRuns}`}
              icon="📅"
            />
            <MetricCard
              label="Snittfart"
              value={formatPace(avgPace)}
              icon="⚡"
              sub="/km"
            />
            <MetricCard
              label="Lengste løp"
              value={`${computed.longestRunKm.toFixed(1)} km`}
              icon="🛣️"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <MetricCard
              label="Totalt løp"
              value={`${computed.totalRunsAllTime}`}
              icon="🏅"
              sub="alle tider"
            />
            <MetricCard
              label="Totalt km"
              value={`${computed.totalKmAllTime.toFixed(0)} km`}
              icon="🌍"
              sub="alle tider"
            />
            <MetricCard
              label="Km i år"
              value={`${computed.ytdKm.toFixed(0)} km`}
              icon="📈"
              sub="YTD"
            />
          </div>

          {/* Zone distribution in oversikt */}
          {recentRuns.length > 0 && avgPace > 0 && (
            <ZoneDistributionBar runs={recentRuns} avgPaceSecPerKm={avgPace} />
          )}
        </div>
      )}

      {/* Løp tab */}
      {activeTab === "løp" && (
        <div className="space-y-3">
          {recentRuns.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <p className="text-4xl mb-3">🏃</p>
              <p>Ingen løp funnet</p>
            </div>
          ) : (
            <>
              {/* Zone distribution at top of run list */}
              {avgPace > 0 && (
                <ZoneDistributionBar runs={recentRuns} avgPaceSecPerKm={avgPace} />
              )}

              <div className="space-y-2">
                {recentRuns.slice(0, 10).map((run) => (
                  <RunCard
                    key={run.id}
                    run={run}
                    avgPaceSecPerKm={avgPace}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Statistikk tab */}
      {activeTab === "statistikk" && (
        <div className="space-y-4">
          {stravaStats && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <StatBlock
                title="All time"
                count={stravaStats.all_run_totals?.count ?? 0}
                distance={((stravaStats.all_run_totals?.distance ?? 0) / 1000).toFixed(0)}
                movingTime={stravaStats.all_run_totals?.moving_time ?? 0}
              />
              <StatBlock
                title="I år (YTD)"
                count={stravaStats.ytd_run_totals?.count ?? 0}
                distance={((stravaStats.ytd_run_totals?.distance ?? 0) / 1000).toFixed(0)}
                movingTime={stravaStats.ytd_run_totals?.moving_time ?? 0}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  icon,
  sub,
}: {
  label: string;
  value: string;
  icon: string;
  sub?: string;
}) {
  return (
    <div className="p-4 bg-gray-800 rounded-xl border border-gray-700">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{icon}</span>
        <span className="text-xs text-gray-400 truncate">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-bold text-white">{value}</span>
        {sub && <span className="text-xs text-gray-400">{sub}</span>}
      </div>
    </div>
  );
}

function RunCard({
  run,
  avgPaceSecPerKm,
}: {
  run: StravaActivity;
  avgPaceSecPerKm: number;
}) {
  const distanceKm = (run.distance / 1000).toFixed(2);
  const secPerKm = getActivityPaceSecPerKm(run);
  const paceStr = formatPace(secPerKm);
  const durationStr = formatDuration(run.moving_time);
  const dateStr = run.start_date_local
    ? new Date(run.start_date_local).toLocaleDateString("nb-NO", {
        weekday: "short",
        day: "numeric",
        month: "short",
      })
    : "";

  return (
    <div className="p-4 bg-gray-800 rounded-xl border border-gray-700 hover:border-gray-600 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-sm font-semibold text-white truncate">
              {run.name || "Løpetur"}
            </span>
            {avgPaceSecPerKm > 0 && (
              <PaceZoneBadge activity={run} avgPaceSecPerKm={avgPaceSecPerKm} />
            )}
          </div>
          <p className="text-xs text-gray-400">{dateStr}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-orange-400">{distanceKm} km</p>
          <p className="text-xs text-gray-400">{durationStr}</p>
        </div>
      </div>
      <div className="flex gap-4 mt-2">
        <span className="text-xs text-gray-400">
          ⚡ {paceStr} /km
        </span>
        {run.total_elevation_gain > 0 && (
          <span className="text-xs text-gray-400">
            ↑ {run.total_elevation_gain.toFixed(0)} m
          </span>
        )}
        {run.average_heartrate && (
          <span className="text-xs text-gray-400">
            ♥ {Math.round(run.average_heartrate)} bpm
          </span>
        )}
      </div>
    </div>
  );
}

function StatBlock({
  title,
  count,
  distance,
  movingTime,
}: {
  title: string;
  count: number;
  distance: string;
  movingTime: number;
}) {
  return (
    <div className="p-4 bg-gray-800 rounded-xl border border-gray-700">
      <h3 className="text-sm font-semibold text-gray-300 mb-3">{title}</h3>
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-xs text-gray-400">Antall løp</span>
          <span className="text-xs font-medium text-white">{count}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-xs text-gray-400">Distanse</span>
          <span className="text-xs font-medium text-white">{distance} km</span>
        </div>
        <div className="flex justify-between">
          <span className="text-xs text-gray-400">Tid</span>
          <span className="text-xs font-medium text-white">
            {formatDuration(movingTime)}
          </span>
        </div>
      </div>
    </div>
  );
}
