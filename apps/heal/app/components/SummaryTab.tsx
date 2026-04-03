"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { getSeedHistory, SEED_LABELS, type SeedHistoryEntry } from "@/lib/seeds";

interface DayData {
  date: string;
  label: string;
  moods: string[];
  breathCount: number;
  journalCount: number;
}

export default function SummaryTab() {
  const { user, accessToken, isAnonymous } = useAuth();
  const [days, setDays] = useState<DayData[]>([]);
  const [streak, setStreak] = useState(0);
  const [insight, setInsight] = useState<string | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [insightPeriod, setInsightPeriod] = useState<"today" | "week" | "month" | "quarter">("today");
  const [speaking, setSpeaking] = useState(false);
  const [unreadReplies, setUnreadReplies] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState<string | null>(null);
  const [seeds, setSeeds] = useState(0);
  const [seedHistory, setSeedHistory] = useState<SeedHistoryEntry[]>([]);
  const [showSeedHistory, setShowSeedHistory] = useState(false);
  const { t, lang } = useI18n();

  useEffect(() => {
    const stored = parseInt(localStorage.getItem("pm-seeds") || "0", 10);
    setSeeds(stored);
    setSeedHistory(getSeedHistory());
    // Listen for seed changes
    const onSeedsChanged = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setSeeds(typeof detail === "number" ? detail : parseInt(localStorage.getItem("pm-seeds") || "0", 10));
      setSeedHistory(getSeedHistory());
    };
    window.addEventListener("seeds-changed", onSeedsChanged);
    return () => window.removeEventListener("seeds-changed", onSeedsChanged);
  }, []);

  useEffect(() => {
    if (user && accessToken) {
      loadWeek(user.id);
      checkUnreadReplies(user.id);
    }
  }, [user, accessToken]);

  useEffect(() => {
    const handleBreath = () => {
      if (user) loadWeek(user.id);
    };
    window.addEventListener("breathe-complete", handleBreath);
    return () => window.removeEventListener("breathe-complete", handleBreath);
  }, [user]);

  const checkUnreadReplies = async (userId: string) => {
    if (!accessToken) return;
    const lastSeen = localStorage.getItem("feedback-last-seen") || "2000-01-01";
    const res = await fetch("/api/feedback-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, accessToken, lastSeen }),
    });
    const data = await res.json();
    setUnreadReplies(data.unreadCount || 0);
  };

  const loadWeek = async (userId: string) => {
    if (!accessToken) return;

    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    const since = sevenDaysAgo.toISOString();

    const yearAgo = new Date();
    yearAgo.setDate(yearAgo.getDate() - 365);
    const streakSince = yearAgo.toISOString();

    const [moodsJson, journalsJson, breathingJson, allMoodsJson] = await Promise.all([
      fetch("/api/mood", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list", userId, accessToken, since, limit: 100 }),
      }).then((r) => r.json()),
      fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list", userId, accessToken }),
      }).then((r) => r.json()),
      fetch("/api/breathing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list", userId, accessToken, since, limit: 100 }),
      }).then((r) => r.json()),
      // Fetch full year of moods for streak calculation
      fetch("/api/mood", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list", userId, accessToken, since: streakSince, limit: 200 }),
      }).then((r) => r.json()),
    ]);

    const dayMap = new Map<string, DayData>();
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(now.getDate() - 6 + i);
      const key = d.toDateString();
      const isToday = d.toDateString() === now.toDateString();
      dayMap.set(key, {
        date: key,
        label: isToday ? t("summary.today") : dayNames[d.getDay()],
        moods: [],
        breathCount: 0,
        journalCount: 0,
      });
    }

    (moodsJson.data || []).forEach((m: { emoji: string; created_at: string }) => {
      const key = new Date(m.created_at).toDateString();
      const day = dayMap.get(key);
      if (day) day.moods.push(m.emoji);
    });

    (journalsJson.data || [])
      .filter((j: { created_at: string }) => new Date(j.created_at) >= sevenDaysAgo)
      .forEach((j: { created_at: string }) => {
        const key = new Date(j.created_at).toDateString();
        const day = dayMap.get(key);
        if (day) day.journalCount++;
      });

    (breathingJson.data || []).forEach((b: { created_at: string }) => {
      const key = new Date(b.created_at).toDateString();
      const day = dayMap.get(key);
      if (day) day.breathCount++;
    });

    const weekDays = Array.from(dayMap.values());
    setDays(weekDays);

    // Calculate streak from ALL data (up to 1 year)
    const datesWithActivity = new Set<string>();
    (allMoodsJson.data || []).forEach((m: { created_at: string }) => {
      datesWithActivity.add(new Date(m.created_at).toDateString());
    });
    (journalsJson.data || []).forEach((j: { created_at: string }) => {
      datesWithActivity.add(new Date(j.created_at).toDateString());
    });
    (breathingJson.data || []).forEach((b: { created_at: string }) => {
      datesWithActivity.add(new Date(b.created_at).toDateString());
    });

    let s = 0;
    for (let i = 0; i < 365; i++) {
      const checkDate = new Date();
      checkDate.setDate(now.getDate() - i);
      if (datesWithActivity.has(checkDate.toDateString())) {
        s++;
      } else if (i === 0) {
        continue; // today not logged yet — check from yesterday
      } else {
        break;
      }
    }
    setStreak(s);
  };

  const loadInsight = async (userId: string, period: string) => {
    const periodDays: Record<string, number> = { today: 0, week: 7, month: 30, quarter: 90 };
    const since = new Date();
    if (period === "today") {
      since.setHours(0, 0, 0, 0);
    } else {
      since.setDate(since.getDate() - periodDays[period]);
    }

    // Check cache
    const cacheKey = `insight-${period}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      const todayStr = new Date().toDateString();
      if (parsed.date === todayStr && parsed.lang === lang) {
        setInsight(parsed.text);
        return;
      }
    }

    if (!accessToken) return;

    // Use server-side APIs that decrypt data
    const [moodsJson, journalsJson, goalsJson, tasksJson, assessmentsJson] = await Promise.all([
      fetch("/api/mood", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list", userId, accessToken, since: since.toISOString(), limit: 50 }),
      }).then((r) => r.json()),
      fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list", userId, accessToken }),
      }).then((r) => r.json()),
      fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list", userId, accessToken }),
      }).then((r) => r.json()),
      fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list", userId, accessToken }),
      }).then((r) => r.json()),
      fetch("/api/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list", accessToken }),
      }).then((r) => r.json()),
    ]);

    const moodData = (moodsJson.data || [])
      .filter((m: { created_at: string }) => new Date(m.created_at) >= since)
      .map((m: { emoji: string; label: string; trigger?: string; helped?: string; created_at: string }) => ({
        emoji: m.emoji,
        label: m.label,
        trigger: m.trigger || undefined,
        helped: m.helped || undefined,
        time: new Date(m.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }),
      }));

    const journalData = (journalsJson.data || [])
      .filter((j: { created_at: string }) => new Date(j.created_at) >= since)
      .map((j: { content: string }) => ({ content: j.content }));

    const pathsData = (goalsJson.data || [])
      .filter((g: { deleted: boolean }) => !g.deleted)
      .map((g: { id: string; name: string; icon: string }) => {
        const goalTasks = (tasksJson.data || []).filter((t: { goal_id: string }) => t.goal_id === g.id);
        return {
          name: g.name,
          icon: g.icon,
          completed: goalTasks.filter((t: { completed: boolean }) => t.completed).length,
          total: goalTasks.length,
        };
      }).filter((p: { total: number }) => p.total > 0);

    // Latest assessment scores (most recent of each type)
    const assessments = (assessmentsJson.data || []) as { type: string; score: number; created_at: string }[];
    const latestPhq9 = assessments.find((a) => a.type === "phq9");
    const latestGad7 = assessments.find((a) => a.type === "gad7");
    const assessmentData: { type: string; score: number; date: string }[] = [];
    if (latestPhq9) assessmentData.push({ type: "PHQ-9 (depression)", score: latestPhq9.score, date: new Date(latestPhq9.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) });
    if (latestGad7) assessmentData.push({ type: "GAD-7 (anxiety)", score: latestGad7.score, date: new Date(latestGad7.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) });

    if (moodData.length === 0 && journalData.length === 0 && pathsData.length === 0 && assessmentData.length === 0) {
      setInsight(null);
      return;
    }

    setLoadingInsight(true);
    try {
      const res = await fetch("/api/daily-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moods: moodData, journals: journalData, paths: pathsData, assessments: assessmentData, lang, period }),
      });
      const data = await res.json();
      if (data.summary) {
        setInsight(data.summary);
        localStorage.setItem(cacheKey, JSON.stringify({
          date: new Date().toDateString(),
          lang,
          text: data.summary,
        }));
      }
    } catch {
      // silently fail
    }
    setLoadingInsight(false);
  };

  const categories = ["moods", "journals", "goals", "tasks", "breathing", "assessments", "photos"] as const;

  const handleDeleteCategory = async (category: string) => {
    if (!accessToken) return;
    setDeleting(true);
    setDeleteMsg(null);
    try {
      const res = await fetch("/api/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete-category", category, accessToken }),
      });
      const data = await res.json();
      if (data.ok) {
        setDeleteMsg(t("data.deleted", { count: data.count, category: t(`data.${category}`) }));
        if (user) loadWeek(user.id);
      }
    } catch { /* silently fail */ }
    setDeleting(false);
    setDeleteConfirm(null);
  };

  const handleDeleteAll = async () => {
    if (!accessToken) return;
    setDeleting(true);
    setDeleteMsg(null);
    try {
      const res = await fetch("/api/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete-all", accessToken }),
      });
      const data = await res.json();
      if (data.ok) {
        setDeleteMsg(t("data.deletedAll"));
        if (user) loadWeek(user.id);
      }
    } catch { /* silently fail */ }
    setDeleting(false);
    setDeleteConfirm(null);
  };

  const today = days[days.length - 1];

  return (
    <section className="py-6 px-4">
      {/* Today's stats */}
      {user && today && (
        <div className="text-center mb-8">
          <h2 className="text-xl font-semibold text-pm-text mb-4">{t("summary.today")}</h2>
          <div className="flex justify-center gap-6">
            <div className="text-center">
              <p className="text-2xl">
                {today.moods.length > 0 ? today.moods.join("") : "—"}
              </p>
              <p className="text-xs text-pm-text-tertiary mt-1">
                {today.moods.length !== 1
                  ? t("summary.moods_plural", { count: today.moods.length })
                  : t("summary.moods", { count: today.moods.length })}
              </p>
            </div>
            <div className="text-center">
              <p className="text-2xl">
                {today.journalCount > 0 ? `📝 ${today.journalCount}` : "—"}
              </p>
              <p className="text-xs text-pm-text-tertiary mt-1">
                {today.journalCount !== 1 ? t("summary.entries_plural") : t("summary.entries")}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Streak + Seeds */}
      {user && (
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-4 bg-pm-surface rounded-full px-5 py-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">{streak >= 7 ? "🔥" : "✨"}</span>
              <span className="text-sm font-semibold text-pm-text">
                {t("summary.streak", { count: streak })}
              </span>
            </div>
            <div className="w-px h-4 bg-pm-border" />
            <div className="flex items-center gap-1.5">
              <span className="text-sm">🌱</span>
              <span className="text-sm font-semibold text-pm-text">{seeds}</span>
              <span className="text-xs text-pm-text-muted">{lang === "zh" ? "种子" : "seeds"}</span>
            </div>
          </div>
        </div>
      )}

      {/* Seeds details */}
      {user && seeds > 0 && (
        <div className="max-w-sm md:max-w-lg mx-auto mb-6">
          <div className="bg-pm-surface rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-pm-text mb-3">
              {lang === "zh" ? "🌱 你的种子" : "🌱 Your Seeds"}
            </h3>
            <div className="space-y-2 text-xs text-pm-text-secondary">
              <div className="flex justify-between">
                <span>{lang === "zh" ? "每日签到" : "Daily check-ins"}</span>
                <span className="text-pm-text">+5 {lang === "zh" ? "/ 天" : "/ day"}</span>
              </div>
              <div className="flex justify-between">
                <span>{lang === "zh" ? "7天连续" : "7-day streak"}</span>
                <span className="text-pm-text">+20 {lang === "zh" ? "额外奖励" : "bonus"}</span>
              </div>
              <div className="flex justify-between">
                <span>{lang === "zh" ? "30天连续" : "30-day streak"}</span>
                <span className="text-pm-text">+100 {lang === "zh" ? "额外奖励" : "bonus"}</span>
              </div>
              <div className="flex justify-between">
                <span>{lang === "zh" ? "100天连续" : "100-day streak"}</span>
                <span className="text-pm-text">+500 {lang === "zh" ? "额外奖励" : "bonus"}</span>
              </div>
              <div className="border-t border-pm-border pt-2 mt-2">
                <p className="text-pm-text-muted italic">
                  {lang === "zh"
                    ? "🛍️ 种子商店即将上线 — 用种子兑换头像装饰和主题"
                    : "🛍️ Seed shop coming soon — spend seeds on avatar hats and themes"}
                </p>
              </div>

              {/* History toggle */}
              <div className="border-t border-pm-border pt-2 mt-2">
                <button
                  onClick={() => setShowSeedHistory(!showSeedHistory)}
                  className="text-xs text-pm-text-muted hover:text-brand cursor-pointer"
                >
                  {showSeedHistory
                    ? (lang === "zh" ? "隐藏历史" : "Hide history")
                    : (lang === "zh" ? "查看历史" : "View history")}
                </button>
              </div>

              {/* Seed history */}
              {showSeedHistory && seedHistory.length > 0 && (
                <div className="border-t border-pm-border pt-2 mt-2 max-h-48 overflow-y-auto space-y-1.5">
                  {seedHistory.map((entry, i) => {
                    const label = SEED_LABELS[entry.action];
                    const displayLabel = label
                      ? (lang === "zh" ? label.zh : label.en)
                      : entry.action;
                    const d = new Date(entry.date);
                    const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                    const timeStr = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
                    return (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <div className="flex-1 min-w-0">
                          <span className="text-pm-text-secondary">{displayLabel}</span>
                          <span className="text-pm-text-muted ml-2">{dateStr} {timeStr}</span>
                        </div>
                        <span className={`font-medium shrink-0 ml-2 ${entry.amount > 0 ? "text-green-600" : "text-red-400"}`}>
                          {entry.amount > 0 ? "+" : ""}{entry.amount}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
              {showSeedHistory && seedHistory.length === 0 && (
                <p className="text-xs text-pm-text-muted mt-2 italic">
                  {lang === "zh" ? "还没有记录" : "No history yet"}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Weekly overview */}
      {user && <div className="max-w-sm md:max-w-lg mx-auto">
        <h3 className="text-sm font-semibold text-pm-text mb-3">
          {t("summary.week")}
        </h3>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const hasActivity =
              day.moods.length > 0 ||
              day.breathCount > 0 ||
              day.journalCount > 0;
            return (
              <div key={day.date} className="text-center">
                <p className="text-xs text-pm-text-tertiary mb-1">{day.label}</p>
                <div
                  className={`rounded-xl py-2 px-1 ${
                    hasActivity ? "bg-brand/15" : "bg-pm-surface"
                  }`}
                >
                  {day.moods.length > 0 ? (
                    <p className="text-sm leading-tight">
                      {day.moods.slice(0, 3).join("")}
                    </p>
                  ) : (
                    <p className="text-sm text-pm-border">·</p>
                  )}
                  {day.journalCount > 0 && (
                    <p className="text-xs mt-0.5">📝{day.journalCount}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>}

      {/* AI Insight */}
      {user && !isAnonymous && (
        <div className="max-w-sm md:max-w-lg mx-auto mt-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-pm-text">
              {lang === "zh" ? "💡 Peacemind 洞察" : "💡 Peacemind Insight"}
            </h3>
            <div className="flex gap-1">
              {(["today", "week", "month", "quarter"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setInsightPeriod(p)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-all ${
                    insightPeriod === p
                      ? "bg-brand text-white"
                      : "bg-pm-surface-active text-pm-text-secondary"
                  }`}
                >
                  {p === "today" ? (lang === "zh" ? "今天" : "Today")
                    : p === "week" ? (lang === "zh" ? "周" : "Week")
                    : p === "month" ? (lang === "zh" ? "月" : "Month")
                    : (lang === "zh" ? "季" : "Quarter")}
                </button>
              ))}
            </div>
          </div>
          {insight ? (
            <div className="bg-pm-surface backdrop-blur-sm rounded-2xl p-4">
              <p className="text-sm text-pm-text-secondary leading-relaxed">{insight}</p>
              <div className="flex items-center gap-3 mt-2">
                <button
                  onClick={() => {
                    if (speaking) {
                      speechSynthesis.cancel();
                      setSpeaking(false);
                    } else {
                      const utterance = new SpeechSynthesisUtterance(insight);
                      utterance.lang = lang === "zh" ? "zh-CN" : "en-US";
                      utterance.rate = 0.9;
                      utterance.onend = () => setSpeaking(false);
                      speechSynthesis.speak(utterance);
                      setSpeaking(true);
                    }
                  }}
                  className="text-xs text-pm-text-muted hover:text-brand cursor-pointer"
                >
                  {speaking
                    ? (lang === "zh" ? "⏹ 停止" : "⏹ Stop")
                    : (lang === "zh" ? "🔊 朗读" : "🔊 Read aloud")}
                </button>
                <button
                  onClick={() => { speechSynthesis.cancel(); setSpeaking(false); setInsight(null); localStorage.removeItem(`insight-${insightPeriod}`); loadInsight(user.id, insightPeriod); }}
                  className="text-xs text-pm-text-muted hover:text-brand cursor-pointer"
                >
                  {lang === "zh" ? "刷新" : "Refresh"}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => loadInsight(user.id, insightPeriod)}
              disabled={loadingInsight}
              className="w-full py-3 rounded-2xl bg-pm-surface text-sm font-medium text-brand cursor-pointer hover:bg-white/70 transition-all disabled:opacity-40"
            >
              {loadingInsight
                ? (lang === "zh" ? "分析中..." : "Analyzing...")
                : (lang === "zh" ? "生成洞察" : "Get Insight")}
            </button>
          )}
        </div>
      )}

      {/* Blurred insight preview for anonymous users */}
      {isAnonymous && (
        <div className="max-w-sm md:max-w-lg mx-auto mt-8">
          <h3 className="text-sm font-semibold text-pm-text mb-3">
            {lang === "zh" ? "💡 Peacemind 洞察" : "💡 Peacemind Insight"}
          </h3>
          <div className="bg-pm-surface backdrop-blur-sm rounded-2xl p-4 relative overflow-hidden">
            <p className="text-sm text-pm-text-secondary leading-relaxed blur-[6px] select-none" aria-hidden>
              {lang === "zh"
                ? "这周你的心情在周三有所好转，似乎和户外活动有关。试试每天花5分钟散步，阳光和新鲜空气可能会帮到你。"
                : "Your mood improved midweek, which seems connected to time outdoors. Try a 5-minute walk each day — sunlight and fresh air can make a real difference."}
            </p>
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-pm-surface/60 backdrop-blur-[2px]">
              <p className="text-sm font-medium text-pm-text mb-2">
                {lang === "zh" ? "登录解锁你的个人洞察" : "Sign in to unlock your personal insights"}
              </p>
              <p className="text-xs text-pm-text-muted">🌱</p>
            </div>
          </div>
        </div>
      )}

      {/* About */}
      <div className="max-w-sm md:max-w-lg mx-auto mt-10 text-center px-4">
        <div className="bg-pm-surface backdrop-blur-sm rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-pm-text mb-3">{t("summary.about")}</h3>
          <div className="text-xs text-pm-text-secondary leading-relaxed space-y-2 text-left">
            <p>🌈 <strong>{t("tab.mood")}</strong> — {t("summary.aboutMood")}</p>
            <p>🍃 <strong>{t("tab.calm")}</strong> — {t("summary.aboutCalm")}</p>
            <p>🌱 <strong>{t("tab.goals")}</strong> — {t("summary.aboutGrow")}</p>
            <p>✨ <strong>{t("tab.me")}</strong> — {t("summary.aboutMe")}</p>
          </div>
        </div>

        {/* Understanding section */}
        <div className="bg-pm-surface backdrop-blur-sm rounded-2xl p-5 text-center mt-4">
          <h3 className="text-sm font-semibold text-pm-text mb-2">{t("learn.title")}</h3>
          <p className="text-xs text-pm-text-secondary leading-relaxed mb-3">{t("learn.subtitle")}</p>
          <div className="text-xs text-pm-text-tertiary leading-relaxed space-y-1 text-left">
            <p>🌊 <strong>{t("learn.anxietyTitle")}</strong> — {t("learn.anxietyWhat").split(".").slice(0, 2).join(".") + "."}</p>
            <p className="mt-1">🌧️ <strong>{t("learn.depressionTitle")}</strong> — {t("learn.depressionWhat").split(".").slice(0, 2).join(".") + "."}</p>
            <p className="mt-1">🌿 <strong>{t("learn.copingTitle")}</strong> — {t("learn.copingWhat").split(".").slice(0, 2).join(".") + "."}</p>
            <p className="mt-1">🤝 <strong>{t("learn.supportTitle")}</strong> — {t("learn.supportWhat").split(".").slice(0, 2).join(".") + "."}</p>
          </div>
          <p className="text-[10px] text-pm-text-muted mt-3 italic">{t("summary.learnMore")}</p>
        </div>
      </div>

      {/* In Loving Memory */}
      <div className="max-w-sm md:max-w-lg mx-auto mt-10 text-center px-4">
        <div className="bg-pm-surface backdrop-blur-sm rounded-2xl p-6">
          <p className="text-2xl mb-3">🕊</p>
          <p className="text-sm text-pm-text-secondary leading-relaxed">
            {t("memory.line1")}
          </p>
          <p className="text-sm text-pm-text-secondary leading-relaxed mt-2">
            {t("memory.line2")}
          </p>
          <p className="text-xs text-pm-text-muted mt-4 italic">
            {t("memory.line3")}
          </p>
          <p className="text-xs text-pm-text-tertiary leading-relaxed mt-2 italic">
            {t("memory.line4")}
          </p>
        </div>
      </div>

      {/* My Data — hidden for now */}
      {false && user && (
        <div className="max-w-sm md:max-w-lg mx-auto mt-10 px-4">
          <div className="bg-pm-surface backdrop-blur-sm rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-pm-text mb-3">{t("data.title")}</h3>

            {deleteMsg && (
              <p className="text-xs text-brand mb-3">{deleteMsg}</p>
            )}

            {/* Delete by category */}
            <p className="text-xs text-pm-text-secondary mb-2">{t("data.deleteCategory")}</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setDeleteConfirm(cat)}
                  disabled={deleting}
                  className="px-3 py-1.5 rounded-full text-xs bg-pm-surface-active text-pm-text-secondary hover:bg-red-100 hover:text-red-600 transition-all cursor-pointer disabled:opacity-40"
                >
                  {t(`data.${cat}`)}
                </button>
              ))}
            </div>

            {/* Delete all */}
            <button
              onClick={() => setDeleteConfirm("all")}
              disabled={deleting}
              className="w-full py-2.5 rounded-xl text-xs font-medium text-red-500 bg-red-50 hover:bg-red-100 transition-all cursor-pointer disabled:opacity-40"
            >
              {deleting ? t("data.deleting") : t("data.deleteAll")}
            </button>

            {/* Confirmation modal */}
            {deleteConfirm && (
              <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200">
                <p className="text-xs text-red-700 mb-3">
                  {deleteConfirm === "all"
                    ? t("data.confirmAll")
                    : t("data.confirmCategory", { category: t(`data.${deleteConfirm}`) })}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => deleteConfirm === "all" ? handleDeleteAll() : handleDeleteCategory(deleteConfirm!)}
                    disabled={deleting}
                    className="flex-1 py-2 rounded-lg text-xs font-medium text-white bg-red-500 hover:bg-red-600 transition-all cursor-pointer disabled:opacity-40"
                  >
                    {deleting ? t("data.deleting") : (lang === "zh" ? "确认删除" : "Confirm Delete")}
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="flex-1 py-2 rounded-lg text-xs font-medium text-pm-text-secondary bg-pm-surface-active hover:bg-pm-surface transition-all cursor-pointer"
                  >
                    {lang === "zh" ? "取消" : "Cancel"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Links */}
      <div className="flex justify-center gap-4 mt-8 text-xs">
        <a href="/about" className="text-brand hover:text-pm-text-secondary font-medium relative">
          {lang === "zh" ? "🆕 新功能 & 反馈" : "🆕 What's New & Feedback"}
          {unreadReplies > 0 && (
            <span className="absolute -top-2 -right-4 bg-[#e8b4c8] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
              {unreadReplies}
            </span>
          )}
        </a>
        <a href="/privacy" className="text-pm-text-muted hover:text-brand">
          {lang === "zh" ? "隐私政策" : "Privacy Policy"}
        </a>
      </div>
    </section>
  );
}
