import DashboardClient from "./DashboardClient";
import DashboardSidebar from "./DashboardSidebar";
import { readUserStats } from "@/lib/stats-store";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ strava?: string }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const stats = await readUserStats(user.id);
  const params = await searchParams;
  return (
    <div className="min-h-screen bg-[#F5F5F3] text-[#111110] flex">
      <DashboardSidebar stats={stats} activePath="/dashboard" />
      <DashboardClient stravaData={stats} stravaStatus={params.strava ?? null} />
    </div>
  );
}



