"use client";

import { useState, useEffect } from "react";
import { getSeeds, loadSeedsFromServer } from "@/lib/seeds";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";

export default function SeedsDisplay() {
  const [seeds, setSeeds] = useState(0);
  const { accessToken, isAnonymous } = useAuth();
  const { lang } = useI18n();

  useEffect(() => {
    if (accessToken && !isAnonymous) {
      loadSeedsFromServer(accessToken).then(({ balance }) => setSeeds(balance));
    } else {
      setSeeds(getSeeds());
    }
    const onChanged = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (typeof detail === "number") setSeeds(detail);
    };
    window.addEventListener("seeds-changed", onChanged);
    return () => window.removeEventListener("seeds-changed", onChanged);
  }, []);

  if (seeds === 0) return null;

  return (
    <div className="flex justify-center mb-3">
      <div className="inline-flex items-center gap-1.5 bg-pm-surface rounded-full px-3 py-1">
        <span className="text-sm">🌱</span>
        <span className="text-xs font-semibold text-pm-text">{seeds}</span>
        <span className="text-[10px] text-pm-text-muted">{lang === "zh" ? "种子" : "seeds"}</span>
      </div>
    </div>
  );
}
