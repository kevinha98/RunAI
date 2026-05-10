import { createClient } from "@/lib/supabase/server";
import { getAnyStravaUserId } from "@/lib/db/user-strava";
import DashboardSidebar from "../DashboardSidebar";
import { readUserStats } from "@/lib/stats-store";
import SettingsClient from "./SettingsClient";

export const metadata = { title: "Innstillinger" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id ?? await getAnyStravaUserId() ?? "";
  const stats = await readUserStats(userId);

  return (
    <div className="min-h-screen bg-[#F5F5F3] text-[#111110] flex">
      <DashboardSidebar stats={stats} activePath="/dashboard/settings" />
      <main className="flex-1 p-6 md:p-10 overflow-x-hidden">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-1">Innstillinger</h1>
          <p className="text-sm text-[#6B6B65] mb-8">Konto og app-innstillinger</p>
          <SettingsClient
            user={{
              email: user?.email ?? null,
              name: (user?.user_metadata?.full_name as string | undefined) ?? null,
              avatar: (user?.user_metadata?.avatar_url as string | undefined) ?? null,
            }}
            stravaConnected={!!stats.athlete}
            stravaAthlete={stats.athlete}
          />
        </div>
      </main>
    </div>
  );
}