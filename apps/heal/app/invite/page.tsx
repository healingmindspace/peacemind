"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function InviteLanding() {
  const searchParams = useSearchParams();
  const [code] = useState(() => {
    // Extract code from URL path or query
    if (typeof window !== "undefined") {
      const path = window.location.pathname;
      const match = path.match(/\/invite\/(.+)/);
      if (match) return match[1];
    }
    return searchParams.get("code") || "";
  });

  useEffect(() => {
    // Store the invite code so it can be redeemed after signup
    if (code) {
      localStorage.setItem("pm-invite-code", code);
    }
  }, [code]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fdf6f0] via-[#f0e6f6] to-[#e8dff0] flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <p className="text-4xl mb-4">🌱</p>
        <h1 className="text-xl font-bold text-[#3d3155] mb-2">
          You&apos;ve been invited to Peacemind
        </h1>
        <p className="text-sm text-[#5a4a7a] mb-6">
          A gentle space for your mental wellness. Your friend thinks you&apos;d like it — and you&apos;ll both earn seeds when you join.
        </p>

        <div className="bg-white/50 rounded-2xl p-4 mb-6">
          <div className="flex justify-around text-center">
            <div>
              <p className="text-lg font-bold text-[#3d3155]">🌱 20</p>
              <p className="text-xs text-[#8a7da0]">Your welcome seeds</p>
            </div>
            <div>
              <p className="text-lg font-bold text-[#3d3155]">🌱 50</p>
              <p className="text-xs text-[#8a7da0]">Your friend earns</p>
            </div>
          </div>
        </div>

        <a
          href="/"
          className="inline-block px-8 py-3 rounded-full bg-[#7c6a9e] text-white font-medium hover:bg-[#6b5b8a] transition-colors"
        >
          Open Peacemind
        </a>
        <p className="text-xs text-[#b0a3c4] mt-4">
          Free forever. No account needed to start.
        </p>
      </div>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-b from-[#fdf6f0] via-[#f0e6f6] to-[#e8dff0] flex items-center justify-center"><p className="text-sm text-[#8a7da0]">Loading...</p></div>}>
      <InviteLanding />
    </Suspense>
  );
}
