import DashboardClient from "./DashboardClient";
import DashboardSidebar from "./DashboardSidebar";
import { readUserStats } from "@/lib/stats-store";
import { createClient } from "@/lib/supabase/server";
import { getAnyStravaUserId } from "@/lib/db/user-strava";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ strava?: string; msg?: string }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id ?? await getAnyStravaUserId() ?? "";
  const stats = await readUserStats(userId);
  const params = await searchParams;
  return (
    <div className="min-h-screen bg-[#F5F5F3] text-[#111110] flex">
      <DashboardSidebar stats={stats} activePath="/dashboard" />
      <DashboardClient stravaData={stats} stravaStatus={params.strava ?? null} stravaErrorMsg={params.msg ?? null} />
    </div>
  );
}