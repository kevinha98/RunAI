"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <button
      onClick={handleSignOut}
      title="Logg ut"
      className="flex items-center gap-1.5 text-[10px] text-[#9A9A92] hover:text-[#FC5200] transition-colors"
    >
      <LogOut size={11} />
      Logg ut
    </button>
  );
}
