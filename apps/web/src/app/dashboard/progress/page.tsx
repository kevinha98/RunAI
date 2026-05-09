import DashboardSidebar from "../DashboardSidebar";
import { readUserStats } from "@/lib/stats-store";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Fremgang" };

export default async function ProgressPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const stats = await readUserStats(user.id);

  return (
    <div className="min-h-screen bg-[#F5F5F3] text-[#111110] flex">
      <DashboardSidebar stats={stats} activePath="/dashboard/progress" />
      <div className="flex-1 md:ml-60 p-4 md:p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2.5">
            <TrendingUp size={22} className="text-[#FC5200]" />
            Fremgang
          </h1>
        </div>
        <div className="bg-white border border-[#E5E5E2] rounded-2xl p-10 max-w-md flex flex-col items-center gap-4">
          <span className="text-5xl">📈</span>
          <h2 className="text-xl font-bold tracking-tight">Fremgang — kommer snart</h2>
          <p className="text-sm text-[#6B6B65] text-center">
            Her vil du se ukentlig km-trend, fartstrend og løpshistorikk basert på Strava-data.
          </p>
        </div>
      </div>
    </div>
  );
}
