import DashboardSidebar from "../DashboardSidebar";
import { readUserStats } from "@/lib/stats-store";
import { createClient } from "@/lib/supabase/server";
import { getAnyStravaUserId } from "@/lib/db/user-strava";
import StrengthClient from "./StrengthClient";

export const metadata = { title: "Styrke" };

export default async function StrengthPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id ?? await getAnyStravaUserId() ?? "";
  const stats = await readUserStats(userId);

  return (
    <div className="min-h-screen bg-[#F5F5F3] text-[#111110] flex">
      <DashboardSidebar stats={stats} activePath="/dashboard/strength" />
      <StrengthClient />
    </div>
  );
}
