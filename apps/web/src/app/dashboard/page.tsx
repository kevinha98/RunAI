import DashboardClient from "./DashboardClient";
import { readStats } from "@/lib/stats-store";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ strava?: string }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const stats = readStats();
  const params = await searchParams;
  return <DashboardClient stravaData={stats} stravaStatus={params.strava ?? null} />;
}



