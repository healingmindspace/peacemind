"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { useApi } from "@/lib/use-api";
import { getSignedUrls, deletePhoto } from "@/lib/photos-api";
import { useI18n } from "@/lib/i18n";
import MoodChart from "./MoodChart";
import TriggerStep from "./mood/TriggerStep";
import MoodHistoryList from "./mood/MoodHistoryList";
import StreakBanner from "@/app/components/StreakBanner";
import { awardSeeds, deductSeeds } from "@/lib/seeds";

interface MoodEntry {
  id: string;
  emoji: string;
  label: string;
  trigger: string | null;
  helped: string | null;
  response: string | null;
  photo_path: string | null;
  created_at: string;
}

type TimeRange = "week" | "month" | "3months";

const RANGE_DAYS: Record<TimeRange, number> = { week: 7, month: 30, "3months": 90 };
const RANGE_LIMITS: Record<TimeRange, number> = { week: 35, month: 150, "3months": 450 };

const TRIGGER_KEYS = [
  "mood.trigger.work", "mood.trigger.relationship", "mood.trigger.family",
  "mood.trigger.health", "mood.trigger.money", "mood.trigger.loneliness",
  "mood.trigger.loss", "mood.trigger.stress", "mood.trigger.goodNews",
  "mood.trigger.friends", "mood.trigger.nature", "mood.trigger.achievement",
];

const HELPED_KEYS = [
  "mood.helped.talk", "mood.helped.walk", "mood.helped.music",
  "mood.helped.breathe", "mood.helped.rest", "mood.helped.exercise",
  "mood.helped.journal", "mood.helped.nothing",
];

type Step = "mood" | "trigger" | "helped" | "done";

interface GrowIntent {
  trigger: string;
  moodLabel?: string;
  moodEmoji?: string;
  helped?: string | null;
  source: "mood-done" | "mood-history" | "journal-history";
}

export default function MoodTracker({ onNavigateToGrow, onSuggestAssessment }: { onNavigateToGrow?: (intent: GrowIntent) => void; onSuggestAssessment?: (type: "phq9" | "gad7") => void }) {
  const [trackerMode, setTrackerMode] = useState<"mood" | "emoji">("mood");
  const [step, setStep] = useState<Step>("mood");
  const [moodLogCount, setMoodLogCount] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [freeEmoji, setFreeEmoji] = useState("");
  const [freeLabel, setFreeLabel] = useState("");
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);
  const [customTrigger, setCustomTrigger] = useState("");
  const [selectedHelped, setSelectedHelped] = useState<string[]>([]);
  const [customHelped, setCustomHelped] = useState("");
  const [history, setHistory] = useState<MoodEntry[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>("week");
  const [backfillDate, setBackfillDate] = useState<string>("");
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [wellnessNudge, setWellnessNudge] = useState<"phq9" | "gad7" | null>(null);
  const [savedTriggers, setSavedTriggers] = useState<{ id: string; label: string }[]>([]);
  const [savedHelped, setSavedHelped] = useState<{ id: string; label: string }[]>([]);
  const [newTriggerInput, setNewTriggerInput] = useState("");
  const [newHelpedInput, setNewHelpedInput] = useState("");
  const [showAddHelped, setShowAddHelped] = useState(false);
  const [hiddenTriggerKeys, setHiddenTriggerKeys] = useState<string[]>([]);
  const { user, accessToken, isAnonymous } = useAuth();
  const { apiFetch } = useApi();
  const { t, lang } = useI18n();

  // Emoji grid for quick-tap logging
  const EMOJI_GRID = ["😊", "😔", "😴", "🥳", "😤", "😢", "😌", "🤩", "😰", "🥱", "💪", "😭", "😶", "🔥", "💀", "🙏", "😂", "🥺", "😎", "🫠"];

  // Keep moods array for backward compat with saveMood/TriggerStep
  const moods = [
    { emoji: "😊", label: "Good", labelKey: "mood.good", responseKey: "mood.response.good" },
    { emoji: "🙂", label: "Okay", labelKey: "mood.okay", responseKey: "mood.response.okay" },
    { emoji: "😐", label: "Neutral", labelKey: "mood.neutral", responseKey: "mood.response.neutral" },
    { emoji: "😔", label: "Low", labelKey: "mood.low", responseKey: "mood.response.low" },
    { emoji: "😢", label: "Struggling", labelKey: "mood.struggling", responseKey: "mood.response.struggling" },
  ];

  const [justSaved, setJustSaved] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);


  useEffect(() => {
    if (user) { loadHistory(user.id, timeRange); loadSavedOptions(); }
    else setHistory([]);
  }, [user, accessToken]);

  useEffect(() => {
    if (user) loadHistory(user.id, timeRange);
  }, [timeRange]);

  // Load signed URLs for photos (server-only, requires account)
  useEffect(() => {
    const photoPaths = history.filter((e) => e.photo_path).map((e) => e.photo_path!);
    if (photoPaths.length === 0 || !accessToken || isAnonymous) return;
    const newPaths = photoPaths.filter((p) => !photoUrls[p]);
    if (newPaths.length === 0) return;
    getSignedUrls(accessToken, newPaths).then((urls) => {
      setPhotoUrls((prev) => ({ ...prev, ...urls }));
    });
  }, [history]);

  const loadHistory = async (userId: string, range: TimeRange) => {
    const since = new Date();
    since.setDate(since.getDate() - RANGE_DAYS[range]);
    if (!accessToken && !isAnonymous) return;

    const res = await apiFetch("/api/mood", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "list",
        userId,
        accessToken: accessToken,
        since: since.toISOString(),
        limit: 10,
        offset: 0,
      }),
    });
    const json = await res.json();
    if (json.data) setHistory(json.data);
    setHasMore(json.hasMore ?? false);
  };

  const loadMore = async () => {
    if (!user || loadingMore || (!accessToken && !isAnonymous)) return;
    setLoadingMore(true);
    const since = new Date();
    since.setDate(since.getDate() - RANGE_DAYS[timeRange]);
    const res = await apiFetch("/api/mood", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "list",
        userId: user.id,
        accessToken: accessToken,
        since: since.toISOString(),
        limit: 10,
        offset: history.length,
      }),
    });
    const json = await res.json();
    if (json.data) setHistory((prev) => [...prev, ...json.data]);
    setHasMore(json.hasMore ?? false);
    setLoadingMore(false);
  };

  const loadSavedOptions = async () => {
    if (!accessToken && !isAnonymous) return;
    const res = await apiFetch("/api/mood-options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "list", accessToken: accessToken }),
    });
    const json = await res.json();
    if (json.data) {
      setSavedTriggers(json.data.filter((o: { type: string }) => o.type === "trigger"));
      setSavedHelped(json.data.filter((o: { type: string }) => o.type === "helped"));
      setHiddenTriggerKeys(json.data.filter((o: { type: string }) => o.type === "hidden_trigger").map((o: { label: string }) => o.label));
    }
  };

  const addSavedOption = async (type: "trigger" | "helped", label: string) => {
    if (!label.trim()) return;
    if (!accessToken && !isAnonymous) return;
    await apiFetch("/api/mood-options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "insert", accessToken: accessToken, type, label: label.trim() }),
    });
    loadSavedOptions();
  };

  const deleteSavedOption = async (id: string) => {
    if (!accessToken && !isAnonymous) return;
    await apiFetch("/api/mood-options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", accessToken: accessToken, id }),
    });
    loadSavedOptions();
  };

  const hidePresetTrigger = async (key: string) => {
    await addSavedOption("hidden_trigger" as "trigger", key);
  };

  const showAllPresets = async () => {
    if (!accessToken && !isAnonymous) return;
    // Delete all hidden_trigger entries
    const res = await apiFetch("/api/mood-options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "list", accessToken: accessToken }),
    });
    const json = await res.json();
    const hiddenItems = (json.data || []).filter((o: { type: string }) => o.type === "hidden_trigger");
    for (const item of hiddenItems) {
      await apiFetch("/api/mood-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", accessToken: accessToken, id: item.id }),
      });
    }
    loadSavedOptions();
  };

  // Compute frequent emojis from history
  const frequentEmojis = useMemo(() => {
    const counts = new Map<string, number>();
    history.forEach((e) => {
      if (e.emoji) counts.set(e.emoji, (counts.get(e.emoji) || 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([emoji]) => emoji);
  }, [history]);

  // Compute streak (consecutive days with at least one log)
  const streak = useMemo(() => {
    const days = new Set(history.map((e) => new Date(e.created_at).toDateString()));
    let count = 0;
    const d = new Date();
    while (days.has(d.toDateString())) {
      count++;
      d.setDate(d.getDate() - 1);
    }
    return count;
  }, [history]);

  // Compute frequent triggers from history (sorted by frequency)
  const frequentTriggers = useMemo(() => {
    const counts = new Map<string, number>();
    history.forEach((e) => {
      if (e.trigger) {
        e.trigger.split(", ").forEach((t) => {
          const trimmed = t.trim();
          if (trimmed) counts.set(trimmed, (counts.get(trimmed) || 0) + 1);
        });
      }
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([trigger, count]) => ({ trigger, count }));
  }, [history]);

  // Custom triggers that aren't in the preset list
  const customTriggers = useMemo(() => {
    const presetLabels = TRIGGER_KEYS.map((k) => t(k));
    return frequentTriggers
      .filter((ft) => !presetLabels.includes(ft.trigger))
      .slice(0, 5);
  }, [frequentTriggers, t]);

  // Pattern detection for selected triggers
  const triggerPattern = useMemo(() => {
    if (selectedTriggers.length === 0 && !customTrigger) return null;
    const allSelected = [...selectedTriggers.map((k) => t(k))];
    if (customTrigger.trim()) allSelected.push(customTrigger.trim());

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentWithSameTrigger = history.filter((e) => {
      if (!e.trigger || new Date(e.created_at) < sevenDaysAgo) return false;
      return allSelected.some((s) => e.trigger!.includes(s));
    });

    if (recentWithSameTrigger.length >= 2) {
      const triggerName = allSelected[0];
      const count = recentWithSameTrigger.length;
      return lang === "zh"
        ? `这周你已经因为"${triggerName}"记录了 ${count} 次情绪`
        : `You've felt this way about "${triggerName}" ${count} times this week`;
    }
    return null;
  }, [selectedTriggers, customTrigger, history, t, lang]);

  const getTodayCount = () => {
    const today = new Date().toDateString();
    return history.filter((e) => new Date(e.created_at).toDateString() === today).length;
  };

  // Map emoji to a mood score (1-5) for AI analysis
  const getEmojiScore = (emojis: string): { score: number; label: string } => {
    const great = "🥳🤩😍🥰🎉💪✨🌟😎🤗💃🕺🏆🎊👏";
    const good = "😊🙂😄😁👍🌈☺️😌🫶🙏💚🍀😋🤭";
    const low = "😔😞😓😟🥺😿💔🫤😕☹️😩🤕";
    const struggling = "😢😭😰😱💀👎😡😤🤬😖😫🆘😵🤮";
    for (const ch of emojis) {
      if (great.includes(ch)) return { score: 5, label: "Great" };
      if (good.includes(ch)) return { score: 4, label: "Good" };
      if (low.includes(ch)) return { score: 2, label: "Low" };
      if (struggling.includes(ch)) return { score: 1, label: "Struggling" };
    }
    return { score: 3, label: "Neutral" };
  };

  const selectMood = (index: number) => {
    setSelected(index);
    setSelectedTriggers([]);
    setSelectedHelped([]);
    setCustomTrigger("");
    setStep("trigger");
  };

  const selectFreeEmoji = async () => {
    if (!freeEmoji || !user || !accessToken) return;
    setSaving(true);

    const scored = getEmojiScore(freeEmoji);
    const moodLabel = freeLabel.trim() || scored.label;
    const res = await fetch("/api/mood", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "insert",
        userId: user.id,
        accessToken,
        emoji: freeEmoji,
        label: moodLabel,
        trigger: null,
        helped: null,
        createdAt: backfillDate ? new Date(backfillDate + "T12:00:00").toISOString() : undefined,
      }),
    });
    const insertedData = await res.json();
    if (insertedData?.id) {
      // Bounce animation
      setJustSaved(freeEmoji);
      setTimeout(() => setJustSaved(null), 800);
      // Get AI emoji response
      fetch("/api/mood-respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken,
          mood: { emoji: freeEmoji, label: moodLabel },
          trigger: null,
          helped: null,
          moodId: insertedData.id,
          lang,
        }),
      });
      awardSeeds("mood", accessToken);
      setMoodLogCount((c) => c + 1);
      loadHistory(user.id, timeRange);
      setFreeEmoji("");
      setFreeLabel("");
      setBackfillDate("");
    }
    setSaving(false);
  };

  // Quick-tap emoji from grid
  const quickLogEmoji = (emoji: string) => {
    setFreeEmoji(emoji);
    // Auto-save immediately
    setTimeout(() => {
      const input = document.getElementById("emoji-input") as HTMLInputElement;
      if (input) {
        input.value = emoji;
        input.form?.requestSubmit();
      }
    }, 50);
  };

  const toggleTrigger = (key: string) => {
    setSelectedTriggers((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const toggleCustomTrigger = (trigger: string) => {
    // Toggle a custom trigger from history
    if (selectedTriggers.includes(`custom:${trigger}`)) {
      setSelectedTriggers((prev) => prev.filter((k) => k !== `custom:${trigger}`));
    } else {
      setSelectedTriggers((prev) => [...prev, `custom:${trigger}`]);
    }
  };

  const toggleHelped = (key: string) => {
    setSelectedHelped((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const buildTriggerString = () => {
    const labels: string[] = [];
    selectedTriggers.forEach((k) => {
      if (k.startsWith("custom:")) {
        labels.push(k.replace("custom:", ""));
      } else {
        labels.push(t(k));
      }
    });
    if (customTrigger.trim()) labels.push(customTrigger.trim());
    return labels.join(", ");
  };

  const saveMood = async () => {
    if (selected === null || !user) return;

    setSaving(true);
    const triggerStr = buildTriggerString();
    const helpedParts = selectedHelped.map((k) => k.startsWith("saved:") ? k.replace("saved:", "") : t(k));
    if (customHelped.trim()) helpedParts.push(customHelped.trim());
    const helpedLabels = helpedParts.join(", ");

    if (!accessToken && !isAnonymous) { setSaving(false); return; }

    const res = await apiFetch("/api/mood", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "insert",
        userId: user.id,
        accessToken: accessToken,
        emoji: moods[selected].emoji,
        label: moods[selected].label,
        trigger: triggerStr || null,
        helped: helpedLabels || null,
        createdAt: backfillDate ? new Date(backfillDate + "T12:00:00").toISOString() : undefined,
      }),
    });
    const insertedData = await res.json();

    if (insertedData?.id) {
      setStep("done");
      setMoodLogCount((c) => c + 1);
      awardSeeds("mood", accessToken);
      loadHistory(user.id, timeRange);

      // Wellness check: detect concerning mood patterns
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentMoods = history.filter((e) => new Date(e.created_at) >= sevenDaysAgo);
      const lowCount = recentMoods.filter((e) => e.label === "Low" || e.label === "Struggling").length + (selected >= 3 ? 1 : 0);
      const anxietyTriggers = ["stress", "loneliness", "压力", "孤独"];
      const hasAnxietyTriggers = triggerStr && anxietyTriggers.some((t) => triggerStr.toLowerCase().includes(t));

      if (lowCount >= 4) {
        setWellnessNudge("phq9");
      } else if (lowCount >= 2 && hasAnxietyTriggers) {
        setWellnessNudge("gad7");
      } else {
        setWellnessNudge(null);
      }

    }

    setSaving(false);
  };

  const resetFlow = () => {
    setStep("mood");
    setSelected(null);
    setFreeEmoji("");
    setFreeLabel("");
    setSelectedTriggers([]);
    setSelectedHelped([]);
    setCustomTrigger("");
    setCustomHelped("");
    setBackfillDate("");
    setShowDatePicker(false);
  };

  const deleteEntryPhoto = async (entryId: string, photoPath: string) => {
    if (!user) return;
    if (accessToken && !isAnonymous) {
      await deletePhoto(accessToken, photoPath);
    }
    loadHistory(user.id, timeRange);
  };

  const updateMood = async (id: string, trigger: string, helped: string) => {
    if (!user || (!accessToken && !isAnonymous)) return;
    await apiFetch("/api/mood", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", userId: user.id, accessToken, id, trigger: trigger || null, helped: helped || null }),
    });
    setHistory((prev) => prev.map((e) => e.id === id ? { ...e, trigger: trigger || null, helped: helped || null } : e));
  };

  const deleteMood = async (id: string) => {
    if (!user) return;
    // Also delete photo from storage if exists (server-only)
    const entry = history.find((e) => e.id === id);
    if (entry?.photo_path && accessToken && !isAnonymous) {
      await deletePhoto(accessToken, entry.photo_path);
    }
    if (!accessToken && !isAnonymous) return;
    const res = await apiFetch("/api/mood", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "delete",
        userId: user.id,
        accessToken: accessToken,
        id,
      }),
    });
    if (res.ok) {
      deductSeeds("mood", accessToken);
      loadHistory(user.id, timeRange);
    }
  };

  // Save emoji with details (trigger/helped) via the detail flow
  const saveWithDetails = async () => {
    if (!freeEmoji || !user) return;
    setSaving(true);

    const scored = getEmojiScore(freeEmoji);
    const moodLabel = scored.label;
    const triggerStr = buildTriggerString();
    const helpedParts = selectedHelped.map((k) => k.startsWith("saved:") ? k.replace("saved:", "") : t(k));
    if (customHelped.trim()) helpedParts.push(customHelped.trim());
    const helpedLabels = helpedParts.join(", ");

    if (!accessToken && !isAnonymous) { setSaving(false); return; }

    const res = await fetch("/api/mood", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "insert",
        userId: user.id,
        accessToken,
        emoji: freeEmoji,
        label: moodLabel,
        trigger: triggerStr || null,
        helped: helpedLabels || null,
        createdAt: backfillDate ? new Date(backfillDate + "T12:00:00").toISOString() : undefined,
      }),
    });
    const insertedData = await res.json();
    if (insertedData?.id) {
      setJustSaved(freeEmoji);
      setTimeout(() => setJustSaved(null), 800);
      fetch("/api/mood-respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken, mood: { emoji: freeEmoji, label: moodLabel }, trigger: triggerStr, helped: helpedLabels, moodId: insertedData.id, lang }),
      });
      awardSeeds("mood", accessToken);
      setMoodLogCount((c) => c + 1);
      loadHistory(user.id, timeRange);

      // Wellness check
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentMoods = history.filter((e) => new Date(e.created_at) >= sevenDaysAgo);
      const currentIsLow = getEmojiScore(freeEmoji).score <= 2;
      const lowCount = recentMoods.filter((e) => e.label === "Low" || e.label === "Struggling").length + (currentIsLow ? 1 : 0);
      const anxietyTriggers = ["stress", "loneliness", "压力", "孤独"];
      const hasAnxietyTriggers = triggerStr && anxietyTriggers.some((t) => triggerStr.toLowerCase().includes(t));
      if (lowCount >= 4) setWellnessNudge("phq9");
      else if (lowCount >= 2 && hasAnxietyTriggers) setWellnessNudge("gad7");
      else setWellnessNudge(null);
    }
    setShowDetails(false);
    setFreeEmoji("");
    setSelectedTriggers([]);
    setSelectedHelped([]);
    setCustomTrigger("");
    setCustomHelped("");
    setSaving(false);
  };

  return (
    <section className="py-6 px-4">
      <style>{`
        @keyframes emoji-bounce {
          0% { transform: scale(1); opacity: 1; }
          30% { transform: scale(1.5); }
          60% { transform: scale(0.9); }
          100% { transform: scale(1); opacity: 1; }
        }
        .emoji-bounce { animation: emoji-bounce 0.6s ease-out; }
      `}</style>

      <StreakBanner onMoodLogged={moodLogCount > 0} />

      {/* Bounce animation overlay */}
      {justSaved && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <span className="text-7xl emoji-bounce">{justSaved}</span>
        </div>
      )}

      {/* Header with streak */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <h2 className="text-lg font-semibold text-pm-text">
          {lang === "zh" ? "心情" : "Emotions"}
        </h2>
        {streak > 1 && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 font-medium">
            🔥 {streak} {lang === "zh" ? "天" : streak === 1 ? "day" : "days"}
          </span>
        )}
      </div>

      {/* Limit warning */}

      {/* Main view — emoji input + details toggle */}
      {!showDetails ? (
        <div className="max-w-sm mx-auto">
          {/* Frequent emojis — quick tap */}
          {frequentEmojis.length > 0 && (
            <div className="flex justify-center gap-1.5 mb-3 flex-wrap">
              <span className="text-[10px] text-pm-text-muted w-full text-center mb-1">
                {lang === "zh" ? "常用" : "Recent"}
              </span>
              {frequentEmojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setFreeEmoji((prev) => prev + emoji)}
                  className={`text-2xl p-1.5 rounded-xl cursor-pointer transition-all active:scale-90 ${
                    freeEmoji.includes(emoji) ? "bg-brand/20 scale-110 ring-2 ring-brand" : "hover:bg-pm-surface-hover hover:scale-125"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {/* Emoji grid */}
          <div className="flex justify-center gap-1 mb-3 flex-wrap">
            {EMOJI_GRID.filter((e) => !frequentEmojis.includes(e)).map((emoji) => (
              <button
                key={emoji}
                onClick={() => setFreeEmoji((prev) => prev + emoji)}
                className={`text-xl p-1 rounded-lg cursor-pointer transition-all active:scale-90 ${
                  freeEmoji.includes(emoji) ? "bg-brand/20 scale-110 ring-2 ring-brand" : "hover:bg-pm-surface-hover hover:scale-110"
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Selected emojis display + input */}
          <form
            onSubmit={(e) => { e.preventDefault(); if (freeEmoji && user) selectFreeEmoji(); }}
            className="flex items-center gap-2 mb-2"
          >
            <div className="flex-1 flex items-center gap-1 px-3 py-2 rounded-2xl bg-pm-surface-active border border-pm-border focus-within:ring-2 focus-within:ring-brand-light">
              {freeEmoji && (
                <>
                  <span className="text-xl">{freeEmoji}</span>
                  <button
                    type="button"
                    onClick={() => setFreeEmoji("")}
                    className="text-xs text-pm-text-muted hover:text-red-400 cursor-pointer ml-1"
                  >
                    ✕
                  </button>
                </>
              )}
              <input
                id="emoji-input"
                type="text"
                value=""
                onChange={(e) => setFreeEmoji((prev) => prev + e.target.value)}
                placeholder={freeEmoji ? "" : (lang === "zh" ? "选择或输入表情..." : "Tap or type emoji...")}
                className="flex-1 bg-transparent text-xl text-center outline-none min-w-[40px]"
              />
            </div>
            <button
              type="submit"
              disabled={!freeEmoji || saving || !user}
              className="w-10 h-10 rounded-full bg-brand text-white flex items-center justify-center cursor-pointer disabled:opacity-40 text-lg shrink-0"
            >
              ⏎
            </button>
          </form>

          {/* Actions row */}
          <div className="flex justify-center gap-3 mb-6">
            <button
              onClick={() => { if (freeEmoji) setShowDetails(true); else setShowDetails(true); }}
              className="text-[10px] text-pm-text-muted hover:text-brand cursor-pointer"
            >
              {lang === "zh" ? "📝 记录详情" : "📝 Log with details"}
            </button>
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="text-[10px] text-pm-text-muted hover:text-brand cursor-pointer"
            >
              {backfillDate
                ? `📅 ${new Date(backfillDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                : (lang === "zh" ? "📅 补录" : "📅 Past day")}
            </button>
            {backfillDate && (
              <button onClick={() => { setBackfillDate(""); setShowDatePicker(false); }} className="text-[10px] text-pm-text-muted hover:text-red-400 cursor-pointer">×</button>
            )}
          </div>

          {showDatePicker && (
            <div className="mb-4 text-center">
              <input
                type="date"
                value={backfillDate}
                max={new Date().toISOString().split("T")[0]}
                onChange={(e) => { setBackfillDate(e.target.value); setShowDatePicker(false); }}
                className="px-3 py-1.5 rounded-xl bg-pm-surface-active border border-pm-border text-pm-text text-xs focus:outline-none focus:ring-2 focus:ring-brand-light"
              />
            </div>
          )}

          {/* Wellness nudge */}
          {wellnessNudge && (
            <div className="mb-4 bg-pm-accent-light/70 rounded-2xl p-3 text-left">
              <p className="text-xs text-pm-text-secondary leading-relaxed">
                {lang === "zh"
                  ? "我们注意到你最近情绪偏低。做一个简单的自我评估？"
                  : "We've noticed a pattern. A quick self check-in might help."}
              </p>
              <button
                onClick={() => onSuggestAssessment?.(wellnessNudge)}
                className="mt-2 px-4 py-1.5 rounded-full text-xs bg-brand text-white cursor-pointer"
              >
                {wellnessNudge === "phq9"
                  ? (lang === "zh" ? "🌧️ 抑郁自评" : "🌧️ Check-In")
                  : (lang === "zh" ? "🌊 焦虑自评" : "🌊 Check-In")}
              </button>
            </div>
          )}

          {/* Chart */}
          {user && history.length > 0 && (
            <MoodChart history={history} timeRange={timeRange} onTimeRangeChange={setTimeRange} />
          )}

          {/* History */}
          {user && history.length > 0 && (
            <MoodHistoryList
              history={history}
              photoUrls={photoUrls}
              onDeleteMood={deleteMood}
              onUpdateMood={updateMood}
              onDeletePhoto={deleteEntryPhoto}
              triggerTags={[...TRIGGER_KEYS.map((k) => t(k)), ...savedTriggers.map((s) => s.label)]}
              helpedTags={[...HELPED_KEYS.map((k) => t(k)), ...savedHelped.map((s) => s.label)]}
              onNavigateToGrow={onNavigateToGrow}
              hasMore={hasMore}
              loadingMore={loadingMore}
              onLoadMore={loadMore}
            />
          )}
        </div>
      ) : (
        /* Detail mode — trigger + helped flow */
        <div className="max-w-sm mx-auto">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setShowDetails(false)} className="text-xs text-pm-text-muted hover:text-brand cursor-pointer">← Back</button>
            <span className="text-2xl">{freeEmoji || "😊"}</span>
            <div className="w-12" />
          </div>

          {/* Emoji picker for details mode */}
          <div className="mb-4">
            <div className="flex justify-center gap-1 mb-2 flex-wrap">
              {EMOJI_GRID.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setFreeEmoji((prev) => prev + emoji)}
                  className={`text-xl p-1 rounded-lg cursor-pointer transition-all active:scale-90 ${
                    freeEmoji.includes(emoji) ? "bg-brand/20 ring-2 ring-brand" : "hover:bg-pm-surface-hover"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 px-3 py-2 rounded-xl bg-pm-surface-active border border-pm-border">
              {freeEmoji && (
                <>
                  <span className="text-xl">{freeEmoji}</span>
                  <button type="button" onClick={() => setFreeEmoji("")} className="text-xs text-pm-text-muted hover:text-red-400 cursor-pointer ml-1">✕</button>
                </>
              )}
              <input
                type="text"
                value=""
                onChange={(e) => setFreeEmoji((prev) => prev + e.target.value)}
                placeholder={freeEmoji ? "" : (lang === "zh" ? "选择或输入..." : "Tap or type...")}
                className="flex-1 bg-transparent text-xl text-center outline-none min-w-[40px]"
              />
            </div>
          </div>

          {/* Trigger step */}
          <TriggerStep
            moods={moods}
            selected={null}
            selectedTriggers={selectedTriggers}
            customTrigger={customTrigger}
            customTriggers={customTriggers}
            savedTriggers={savedTriggers}
            hiddenTriggerKeys={hiddenTriggerKeys}
            triggerPattern={triggerPattern}
            triggerKeys={TRIGGER_KEYS}
            onSelectMood={() => {}}
            onToggleTrigger={toggleTrigger}
            onToggleCustomTrigger={toggleCustomTrigger}
            onCustomTriggerChange={setCustomTrigger}
            onAddSaved={(label) => addSavedOption("trigger", label)}
            onDeleteSaved={deleteSavedOption}
            onHidePreset={hidePresetTrigger}
            onShowAllPresets={showAllPresets}
            onNext={() => {}}
            onSkip={() => {}}
          />

          {/* Helped section */}
          <div className="mt-4">
            <p className="text-xs text-pm-text-secondary font-medium mb-2 text-center">{t("mood.whatHelped")}</p>
            <div className="flex flex-wrap gap-1.5 justify-center mb-2">
              {HELPED_KEYS.map((key) => (
                <button
                  key={key}
                  onClick={() => toggleHelped(key)}
                  className={`px-3 py-1.5 rounded-full text-xs cursor-pointer transition-all ${
                    selectedHelped.includes(key) ? "bg-brand text-white" : "bg-pm-surface-active text-pm-text-secondary hover:bg-pm-surface-hover"
                  }`}
                >
                  {t(key)}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder={lang === "zh" ? "或输入..." : "Or type..."}
              value={customHelped}
              onChange={(e) => setCustomHelped(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl bg-pm-surface-active border border-pm-border text-pm-text text-xs focus:outline-none focus:ring-2 focus:ring-brand-light mb-3"
            />
          </div>

          {/* Save */}
          <div className="flex justify-center gap-3">
            <button
              onClick={saveWithDetails}
              disabled={!freeEmoji || saving}
              className="px-6 py-2 rounded-full text-xs font-medium bg-brand text-white cursor-pointer disabled:opacity-40"
            >
              {saving ? "..." : (lang === "zh" ? "保存" : "Save")}
            </button>
            <button
              onClick={() => setShowDetails(false)}
              className="px-6 py-2 rounded-full text-xs font-medium bg-pm-surface-active text-pm-text-secondary cursor-pointer"
            >
              {lang === "zh" ? "取消" : "Cancel"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
