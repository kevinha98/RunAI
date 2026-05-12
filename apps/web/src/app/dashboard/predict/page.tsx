import DashboardSidebar from "../DashboardSidebar";
import { readUserStats } from "@/lib/stats-store";
import { getAnyStravaUserId } from "@/lib/db/user-strava";
import { createClient } from "@/lib/supabase/server";
import { computePersonalBests } from "@/lib/strava-types";
import PredictClient from "./PredictClient";

export const metadata = { title: "Tidsprediksjon — RunAI" };

function secToTimeStr(secs: number): string {
  if (!secs || secs <= 0) return "";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.round(secs % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default async function PredictPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id ?? await getAnyStravaUserId() ?? "";
  const stats = await readUserStats(userId);

  const bests = computePersonalBests(stats.recentRuns ?? []);
  const initialFiveK = secToTimeStr(bests.fiveKm);
  const initialTenK = secToTimeStr(bests.tenKm);

  return (
    <div className="min-h-screen bg-[#F5F5F3] text-[#111110] flex">
      <DashboardSidebar stats={stats} activePath="/dashboard/predict" />
      <main className="flex-1 p-6 md:p-10 overflow-x-hidden">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-1">Tidsprediksjon</h1>
          <p className="text-sm text-[#6B6B65] mb-6">
            Estimer halvmaraton- og maratontid basert på dine løpsresultater
          </p>
          <PredictClient initialFiveK={initialFiveK} initialTenK={initialTenK} />
        </div>
      </main>
    </div>
  );
}