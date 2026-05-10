import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WEEKS, getCurrentWeek } from "@/lib/plan-data";
import { OverridesMap, SessionOverride } from "@/lib/session-overrides";
import PlanClient from "./PlanClient";

export default async function PlanPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const currentWeek = getCurrentWeek();

  // Fetch all overrides for this user
  const { data: rows, error } = await supabase
    .from("plan_overrides")
    .select("week, day, field, value")
    .eq("user_id", user.id);

  const initialOverrides: OverridesMap = {};

  if (!error && rows) {
    for (const row of rows) {
      const key = `${row.week}-${row.day}`;
      if (!initialOverrides[key]) {
        initialOverrides[key] = {} as SessionOverride;
      }
      const field = row.field as keyof SessionOverride;
      (initialOverrides[key] as Record<string, string>)[field] = row.value;
    }
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Treningsplan</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Bergen City Marathon · 24. april 2027
        </p>
      </div>
      <PlanClient
        weeks={WEEKS}
        currentWeek={currentWeek}
        userId={user.id}
        initialOverrides={initialOverrides}
      />
    </main>
  );
}
