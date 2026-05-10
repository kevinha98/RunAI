import DashboardSidebar from "../DashboardSidebar";
import { readUserStats } from "@/lib/stats-store";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { WEEKS, getCurrentWeek } from "@/lib/plan-data";
import { loadSessionOverrides } from "@/lib/session-overrides";
import PlanTable from "./PlanTable";

export const metadata = { title: "Treningsplan" };

export default async function PlanPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [stats, initialOverrides] = await Promise.all([
    readUserStats(user.id),
    loadSessionOverrides(user.id),
  ]);
  const currentWeek = getCurrentWeek();

  return (
    <div className="min-h-screen bg-[#F5F5F3] text-[#111110] flex">
      <DashboardSidebar stats={stats} activePath="/dashboard/plan" />
      <main className="flex-1 p-6 md:p-10 overflow-x-hidden">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-1">Treningsplan</h1>
          <p className="text-sm text-[#6B6B65] mb-6">
            Bergen City Marathon &mdash; 24. april 2027 &middot; {WEEKS.length} uker &middot; Start 5. mai 2026
          </p>
          <p className="text-xs text-[#9B9B95] mb-4">
            Klikk på en uke for å se alle enkeltøktene (mandag–søndag).
          </p>

          <PlanTable weeks={WEEKS} currentWeek={currentWeek} userId={user.id} initialOverrides={initialOverrides} />

          <p className="text-xs text-[#9B9B95] mt-4">
            Totalt {WEEKS.length} uker &middot; Start 5. mai 2026 &middot; Løp 24. april 2027
          </p>
        </div>
      </main>
    </div>
  );
}
