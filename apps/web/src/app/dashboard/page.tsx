import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";

// Server component — auth check will go here
export default function DashboardPage() {
  // TODO: replace with real Supabase auth check
  // const supabase = createClient();
  // const { data: { user } } = await supabase.auth.getUser();
  // if (!user) redirect("/login");

  return <DashboardClient />;
}
