"use client";

import { createClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
  const error = searchParams.get("error");

  const handleGoogleLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
  };

  return (
    <div className="w-full max-w-sm">
      {/* Error */}
      {error && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-red-900/30 border border-red-700/40 text-red-300 text-sm text-center">
          Innlogging feilet. Pr\u00f8v igjen.
        </div>
      )}

      {/* Card */}
      <div className="bg-[#111110] border border-[#2E2E29] rounded-2xl p-8">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 bg-[#FC5200] rounded-xl flex items-center justify-center shadow-lg shadow-orange-900/40">
            <span className="text-white font-black text-sm">R</span>
          </div>
          <span className="font-bold text-[#F2F2F0] text-lg">RunAI</span>
        </div>

        <h1 className="text-xl font-black text-[#F2F2F0] mb-1">Logg inn</h1>
        <p className="text-sm text-[#9A9A92] mb-7">
          Koble til Google-kontoen din for \u00e5 f\u00e5 tilgang til dashbordet.
        </p>

        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white text-[#1A1A17] font-semibold text-sm px-5 py-3.5 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
        >
          <GoogleIcon />
          Fortsett med Google
        </button>

        <p className="text-xs text-[#5A5A54] text-center mt-6 leading-relaxed">
          Ved \u00e5 logge inn aksepterer du v\u00e5re vilk\u00e5r.
          Kontoen din lagres sikkert via Supabase.
        </p>
      </div>

      {/* Feature hints */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        {[
          { icon: "\ud83c\udfc3", label: "Strava-integrasjon" },
          { icon: "\ud83e\udde0", label: "AI-treningsplan" },
          { icon: "\ud83d\udcca", label: "Fremgangsporing" },
        ].map((f) => (
          <div
            key={f.label}
            className="bg-[#111110] border border-[#2E2E29] rounded-xl p-3 text-center"
          >
            <div className="text-xl mb-1">{f.icon}</div>
            <div className="text-[10px] text-[#5A5A54] leading-tight">{f.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#0D0D0C] text-[#F2F2F0] flex flex-col items-center justify-center px-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
