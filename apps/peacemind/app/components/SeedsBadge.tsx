"use client";

import { useState, useEffect } from "react";

const SEEDS_KEY = "pm-seeds";

export default function SeedsBadge() {
  const [seeds, setSeeds] = useState<number | null>(null);

  useEffect(() => {
    const stored = parseInt(localStorage.getItem(SEEDS_KEY) || "0", 10);
    if (stored > 0) setSeeds(stored);

    const onSeedsChanged = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const val = typeof detail === "number" ? detail : parseInt(localStorage.getItem(SEEDS_KEY) || "0", 10);
      setSeeds(val > 0 ? val : null);
    };
    window.addEventListener("seeds-changed", onSeedsChanged);
    return () => window.removeEventListener("seeds-changed", onSeedsChanged);
  }, []);

  if (!seeds) return null;

  return (
    <div className="flex items-center gap-1.5 bg-pm-surface rounded-full px-3 py-1.5">
      <span className="text-sm">🌱</span>
      <span className="text-sm font-semibold text-pm-text">{seeds}</span>
    </div>
  );
}
