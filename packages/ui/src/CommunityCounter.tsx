"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n";

export default function CommunityCounter() {
  const [count, setCount] = useState<number | null>(null);
  const { lang } = useI18n();

  useEffect(() => {
    fetch("/api/visit")
      .then((r) => r.json())
      .then((data) => {
        const total = (data.visitors || 0) + (data.actions || 0);
        if (total > 0) setCount(total);
      })
      .catch(() => {});
  }, []);

  if (!count) return null;

  return (
    <p className="text-xs text-pm-text-muted text-center pb-2">
      {lang === "zh"
        ? `今天有 ${count} 人在 Heal 找到平静`
        : `${count} people found calm on Heal today`}
    </p>
  );
}
