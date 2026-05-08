import DashboardClient from "./DashboardClient";
import DashboardSidebar from "./DashboardSidebar";
import { readStats } from "@/lib/stats-store";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ strava?: string }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const stats = readStats();
  const params = await searchParams;
  return (
    <div className="min-h-screen bg-[#0D0D0C] text-[#F2F2F0] flex">
      <DashboardSidebar stats={stats} activePath="/dashboard" />
      <DashboardClient stravaData={stats} stravaStatus={params.strava ?? null} />
    </div>
  );
}



