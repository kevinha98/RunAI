"use client";

import { useState } from "react";
import { X } from "lucide-react";

export function InfoPopup({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-flex">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-4 h-4 rounded-full border border-[#C8C8C4] text-[#9B9B95] hover:border-[#FC5200] hover:text-[#FC5200] transition-colors flex items-center justify-center text-[9px] font-bold leading-none"
        aria-label="Info"
      >
        i
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-6 top-0 z-50 w-64 bg-white border border-[#E5E5E2] rounded-xl shadow-lg p-3 text-xs text-[#3D3D38] leading-relaxed">
            {children}
            <button onClick={() => setOpen(false)} className="absolute top-2 right-2 text-[#C8C8C4] hover:text-[#6B6B65]">
              <X className="h-3 w-3" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/** Small inline badge to show where data is stored */
export function StorageBadge({ type }: { type: "supabase" | "local" | "readonly" }) {
  if (type === "supabase") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
        Lagres permanent
      </span>
    );
  }
  if (type === "local") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
        Kun i nettleseren
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#6B6B65] bg-[#F0F0EE] border border-[#E5E5E2] rounded-full px-2 py-0.5">
      <span className="w-1.5 h-1.5 rounded-full bg-[#C8C8C4] inline-block" />
      Kun lesing
    </span>
  );
}
