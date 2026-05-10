import DashboardSidebar from "../DashboardSidebar";
import { readUserStats } from "@/lib/stats-store";
import { getAnyStravaUserId } from "@/lib/db/user-strava";
import { createClient } from "@/lib/supabase/server";
import PredictClient from "./PredictClient";

export const metadata = { title: "Tidsprediksjon — RunAI" };

export default async function PredictPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id ?? await getAnyStravaUserId() ?? "";
  const stats = await readUserStats(userId);

  return (
    <div className="min-h-screen bg-[#F5F5F3] text-[#111110] flex">
      <DashboardSidebar stats={stats} activePath="/dashboard/predict" />
      <main className="flex-1 p-6 md:p-10 overflow-x-hidden">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-1">Tidsprediksjon</h1>
          <p className="text-sm text-[#6B6B65] mb-6">
            Estimer halvmaraton- og maratontid basert på dine løpsresultater
          </p>
          <PredictClient />
        </div>
      </main>
    </div>
  );
}