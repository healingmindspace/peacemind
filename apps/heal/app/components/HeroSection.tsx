"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";

const HERO_COUNT = 14;

export default function HeroSection() {
  const { t, lang } = useI18n();
  const { user, accessToken } = useAuth();
  const [greeting, setGreeting] = useState("");
  const [comfort, setComfort] = useState("");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting(t("greeting.morning"));
    else if (hour < 17) setGreeting(t("greeting.afternoon"));
    else setGreeting(t("greeting.evening"));
  }, [t]);

  useEffect(() => {
    const loadComfort = async () => {
      // Check cache first
      const cacheKey = `daily-comfort-${new Date().toDateString()}-${lang}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) { setComfort(cached); return; }

      // Fallback while loading
      const dayIndex = Math.floor(Date.now() / 86400000) % HERO_COUNT;
      setComfort(t(`hero.${dayIndex + 1}`));

      try {
        const res = await fetch("/api/daily-comfort", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user?.id || null,
            accessToken: accessToken || null,
            lang,
          }),
        });
        const data = await res.json();
        if (data.message) {
          setComfort(data.message);
          localStorage.setItem(cacheKey, data.message);
        }
      } catch { /* keep fallback */ }
    };

    loadComfort();
  }, [lang, t, user, accessToken]);

  return (
    <section className="text-center py-4 px-4 md:py-8">
      <h1 className="text-2xl md:text-3xl font-bold text-pm-text">{greeting}</h1>
      {comfort && (
        <p className="text-sm text-pm-text-tertiary mt-2 max-w-xs mx-auto leading-relaxed italic">
          {comfort}
        </p>
      )}
    </section>
  );
}
