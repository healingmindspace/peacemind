"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useApi } from "@/lib/use-api";
import { useI18n } from "@/lib/i18n";
import { awardSeeds, SEED_REWARDS } from "@/lib/seeds";

const LAST_CHECKIN_KEY = "pm-last-checkin";
const STREAK_KEY = "pm-streak";

const MILESTONES = [
  { days: 7, message: { en: "One week of showing up!", zh: "坚持���一周��" } },
  { days: 14, message: { en: "Two weeks strong!", zh: "两周了，真棒！" } },
  { days: 30, message: { en: "A whole month. That takes real courage.", zh: "整整一个月。这需要真正的勇气。" } },
  { days: 60, message: { en: "60 days. You're building something beautiful.", zh: "60天。你正在建��美好的东西。" } },
  { days: 100, message: { en: "100 days. You should be proud.", zh: "100天。你应该为自��骄傲。" } },
  { days: 365, message: { en: "One year. Incredible.", zh: "一整年。不可思议。" } },
];

function getStoredStreak(): { streak: number; lastDate: string } {
  if (typeof window === "undefined") return { streak: 0, lastDate: "" };
  return {
    streak: parseInt(localStorage.getItem(STREAK_KEY) || "0", 10),
    lastDate: localStorage.getItem(LAST_CHECKIN_KEY) || "",
  };
}

interface StreakBannerProps {
  /** Call this when a new mood is logged to refresh the streak */
  onMoodLogged?: boolean;
}

export default function StreakBanner({ onMoodLogged }: StreakBannerProps) {
  const { user, accessToken } = useAuth();
  const { apiFetch, isAnonymous } = useApi();
  const { lang } = useI18n();
  const [streak, setStreak] = useState(0);
  const [seeds, setSeeds] = useState(0);
  const [milestone, setMilestone] = useState<string | null>(null);
  const [seedsEarned, setSeedsEarned] = useState(0);
  const [showSeedAnim, setShowSeedAnim] = useState(false);

  // Calculate streak from mood history
  useEffect(() => {
    if (!user) return;
    loadStreak();
  }, [user, onMoodLogged]);

  useEffect(() => {
    if (accessToken) {
      import("@/lib/seeds").then(({ loadSeedsFromServer }) =>
        loadSeedsFromServer(accessToken).then(({ balance }) => setSeeds(balance))
      );
    }
    const onSeedsChanged = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (typeof detail === "number") setSeeds(detail);
    };
    window.addEventListener("seeds-changed", onSeedsChanged);
    return () => window.removeEventListener("seeds-changed", onSeedsChanged);
  }, [accessToken]);

  const loadStreak = async () => {
    const since = new Date();
    since.setDate(since.getDate() - 365); // Look back up to a year

    try {
      const res = await apiFetch("/api/mood", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "list",
          userId: user!.id,
          accessToken: null,
          since: since.toISOString(),
          limit: 200,
        }),
      });
      const json = await res.json();
      if (!json.data) return;

      // Get unique dates with mood entries
      const datesWithMoods = new Set<string>();
      json.data.forEach((m: { created_at: string }) => {
        datesWithMoods.add(new Date(m.created_at).toDateString());
      });

      // Calculate streak backwards from today
      let currentStreak = 0;
      const today = new Date();
      for (let i = 0; i < 365; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        if (datesWithMoods.has(checkDate.toDateString())) {
          currentStreak++;
        } else if (i === 0) {
          // Today hasn't been logged yet — check from yesterday
          continue;
        } else {
          break;
        }
      }

      const todayStr = today.toDateString();
      const stored = getStoredStreak();

      // Check if this is a new day's check-in (for streak milestones only)
      if (datesWithMoods.has(todayStr) && stored.lastDate !== todayStr) {
        let earned = 0;

        // Streak milestone bonuses
        if (currentStreak === 7) { earned += SEED_REWARDS.streak7; await awardSeeds("streak7", accessToken); }
        if (currentStreak === 30) { earned += SEED_REWARDS.streak30; await awardSeeds("streak30", accessToken); }
        if (currentStreak === 100) { earned += SEED_REWARDS.streak100; await awardSeeds("streak100", accessToken); }

        if (earned > 0) {
          setSeedsEarned(earned);
          setShowSeedAnim(true);
          setTimeout(() => setShowSeedAnim(false), 2000);
        }

        localStorage.setItem(LAST_CHECKIN_KEY, todayStr);
        localStorage.setItem(STREAK_KEY, String(currentStreak));
      }
      setStreak(currentStreak);

      // Check for milestone message
      const ms = MILESTONES.find((m) => m.days === currentStreak);
      if (ms) {
        setMilestone(lang === "zh" ? ms.message.zh : ms.message.en);
      } else {
        setMilestone(null);
      }
    } catch {
      // Fall back to stored streak
      setStreak(getStoredStreak().streak);
    }
  };

  if (!user || streak === 0) return null;

  return (
    <div className="max-w-sm md:max-w-lg mx-auto mb-4 px-4">
      <div className="flex items-center justify-between bg-pm-surface rounded-2xl px-4 py-3">
        {/* Streak */}
        <div className="flex items-center gap-2">
          <span className="text-lg">{streak >= 7 ? "🔥" : "✨"}</span>
          <div>
            <span className="text-sm font-semibold text-pm-text">
              {lang === "zh" ? `${streak} 天` : `${streak} day${streak !== 1 ? "s" : ""}`}
            </span>
            {milestone && (
              <p className="text-[10px] text-brand">{milestone}</p>
            )}
          </div>
        </div>

        {/* Seeds */}
        <div className="flex items-center gap-1.5 relative">
          <span className="text-sm">🌱</span>
          <span className="text-sm font-semibold text-pm-text">{seeds}</span>
          {showSeedAnim && seedsEarned > 0 && (
            <span className="absolute -top-4 right-0 text-xs font-bold text-brand animate-bounce">
              +{seedsEarned}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
