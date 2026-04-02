"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { uploadPhoto, getSignedUrls, deletePhoto } from "@/lib/photos-api";
import { useI18n } from "@/lib/i18n";
import MoodChart from "./MoodChart";
import TriggerStep from "./mood/TriggerStep";
import MoodHistoryList from "./mood/MoodHistoryList";

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
  const [step, setStep] = useState<Step>("mood");
  const [selected, setSelected] = useState<number | null>(null);
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);
  const [customTrigger, setCustomTrigger] = useState("");
  const [selectedHelped, setSelectedHelped] = useState<string[]>([]);
  const [customHelped, setCustomHelped] = useState("");
  const [history, setHistory] = useState<MoodEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>("week");
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [backfillDate, setBackfillDate] = useState<string>("");
  const [extractingPhoto, setExtractingPhoto] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
  const [photoSuggestion, setPhotoSuggestion] = useState("");
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [wellnessNudge, setWellnessNudge] = useState<"phq9" | "gad7" | null>(null);
  const [savedTriggers, setSavedTriggers] = useState<{ id: string; label: string }[]>([]);
  const [savedHelped, setSavedHelped] = useState<{ id: string; label: string }[]>([]);
  const [newTriggerInput, setNewTriggerInput] = useState("");
  const [newHelpedInput, setNewHelpedInput] = useState("");
  const [showAddHelped, setShowAddHelped] = useState(false);
  const [hiddenTriggerKeys, setHiddenTriggerKeys] = useState<string[]>([]);
  const { user, accessToken } = useAuth();
  const { t, lang } = useI18n();

  const moods = [
    { emoji: "😊", label: "Good", labelKey: "mood.good", responseKey: "mood.response.good" },
    { emoji: "🙂", label: "Okay", labelKey: "mood.okay", responseKey: "mood.response.okay" },
    { emoji: "😐", label: "Neutral", labelKey: "mood.neutral", responseKey: "mood.response.neutral" },
    { emoji: "😔", label: "Low", labelKey: "mood.low", responseKey: "mood.response.low" },
    { emoji: "😢", label: "Struggling", labelKey: "mood.struggling", responseKey: "mood.response.struggling" },
  ];

  const handleMoodPhoto = async (file: File) => {
    if (!file || !file.type.startsWith("image/") || !user) return;
    setExtractingPhoto(true);
    try {
      const { resizeImage } = await import("@/lib/resize-image");
      const base64 = await resizeImage(file);
      try {
        const res = await fetch("/api/extract-mood-photo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64, lang }),
        });
        const data = await res.json();
        // Try to match trigger to a preset key
        if (data.trigger) {
          const triggerLower = data.trigger.toLowerCase();
          const presetMatch = TRIGGER_KEYS.find((k) => {
            const label = t(k).toLowerCase();
            return triggerLower.includes(label) || label.includes(triggerLower);
          });
          if (presetMatch) {
            setSelectedTriggers([presetMatch]);
          }
          // Put details in custom trigger field
          if (data.details) setCustomTrigger(data.details);
          else setCustomTrigger(data.trigger);
        }
        if (data.suggestion) setPhotoSuggestion(data.suggestion);
        setPendingPhoto(file);
        setStep("trigger");
      } catch { /* ignore */ }
    } catch { /* resize failed */ }
    setExtractingPhoto(false);
  };

  useEffect(() => {
    if (user && accessToken) { loadHistory(user.id, timeRange); loadSavedOptions(); }
    else setHistory([]);
  }, [user, accessToken]);

  useEffect(() => {
    if (user) loadHistory(user.id, timeRange);
  }, [timeRange]);

  // Load signed URLs for photos
  useEffect(() => {
    const photoPaths = history.filter((e) => e.photo_path).map((e) => e.photo_path!);
    if (photoPaths.length === 0 || !accessToken) return;
    const newPaths = photoPaths.filter((p) => !photoUrls[p]);
    if (newPaths.length === 0) return;
    getSignedUrls(accessToken, newPaths).then((urls) => {
      setPhotoUrls((prev) => ({ ...prev, ...urls }));
    });
  }, [history]);

  const loadHistory = async (userId: string, range: TimeRange) => {
    const since = new Date();
    since.setDate(since.getDate() - RANGE_DAYS[range]);
    if (!accessToken) return;

    const res = await fetch("/api/mood", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "list",
        userId,
        accessToken: accessToken,
        since: since.toISOString(),
        limit: RANGE_LIMITS[range],
      }),
    });
    const json = await res.json();
    if (json.data) setHistory(json.data);
  };

  const loadSavedOptions = async () => {
    if (!accessToken) return;
    const res = await fetch("/api/mood-options", {
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
    if (!accessToken) return;
    await fetch("/api/mood-options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "insert", accessToken: accessToken, type, label: label.trim() }),
    });
    loadSavedOptions();
  };

  const deleteSavedOption = async (id: string) => {
    if (!accessToken) return;
    await fetch("/api/mood-options", {
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
    if (!accessToken) return;
    // Delete all hidden_trigger entries
    const res = await fetch("/api/mood-options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "list", accessToken: accessToken }),
    });
    const json = await res.json();
    const hiddenItems = (json.data || []).filter((o: { type: string }) => o.type === "hidden_trigger");
    for (const item of hiddenItems) {
      await fetch("/api/mood-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", accessToken: accessToken, id: item.id }),
      });
    }
    loadSavedOptions();
  };

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

  const selectMood = (index: number) => {
    setSelected(index);
    setSelectedTriggers([]);
    setSelectedHelped([]);
    setCustomTrigger("");
    setAiResponse(null);
    setStep("trigger");
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
    if (!backfillDate && getTodayCount() >= 5) return;

    setSaving(true);
    const triggerStr = buildTriggerString();
    const helpedParts = selectedHelped.map((k) => k.startsWith("saved:") ? k.replace("saved:", "") : t(k));
    if (customHelped.trim()) helpedParts.push(customHelped.trim());
    const helpedLabels = helpedParts.join(", ");

    if (!accessToken) { setSaving(false); return; }

    // Upload photo if exists
    let photoPath: string | null = null;
    if (pendingPhoto) {
      photoPath = await uploadPhoto(accessToken, pendingPhoto, `${user.id}/mood`);
    }

    const res = await fetch("/api/mood", {
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
        photoPath,
      }),
    });
    const insertedData = await res.json();

    if (insertedData?.id) {
      setStep("done");
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

      // Get AI response and save encrypted to DB
      setLoadingAi(true);
      const recentForAi = history.slice(0, 10).map((e) => ({
        emoji: e.emoji,
        label: e.label,
        trigger: e.trigger,
        helped: e.helped,
      }));

      fetch("/api/mood-respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mood: { emoji: moods[selected].emoji, label: moods[selected].label },
          trigger: triggerStr || null,
          helped: helpedLabels || null,
          recentHistory: recentForAi,
          lang,
          moodId: insertedData.id,
          accessToken,
        }),
      })
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (data?.response) {
            setAiResponse(data.response);
            loadHistory(user.id, timeRange);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingAi(false));
    }

    setSaving(false);
  };

  const resetFlow = () => {
    setStep("mood");
    setSelected(null);
    setSelectedTriggers([]);
    setSelectedHelped([]);
    setCustomTrigger("");
    setCustomHelped("");
    setAiResponse(null);
    setBackfillDate("");
    setShowDatePicker(false);
    setPendingPhoto(null);
    setPhotoSuggestion("");
  };

  const deleteEntryPhoto = async (entryId: string, photoPath: string) => {
    if (!user || !accessToken) return;
    await deletePhoto(accessToken, photoPath);
    loadHistory(user.id, timeRange);
  };

  const deleteMood = async (id: string) => {
    if (!user) return;
    // Also delete photo from storage if exists
    const entry = history.find((e) => e.id === id);
    if (entry?.photo_path && accessToken) {
      await deletePhoto(accessToken, entry.photo_path);
    }
    if (!accessToken) return;
    const res = await fetch("/api/mood", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "delete",
        userId: user.id,
        accessToken: accessToken,
        id,
      }),
    });
    if (res.ok) loadHistory(user.id, timeRange);
  };

  return (
    <section className="py-6 px-4 text-center">
      <h2 className="text-xl font-semibold text-pm-text mb-1">
        {t("mood.title")}
      </h2>
      {user && getTodayCount() >= 5 && !backfillDate && (
        <p className="text-sm text-pm-text-muted mb-6">{t("mood.limit")}</p>
      )}

      {/* Step 1: Pick mood */}
      {step === "mood" && (
        <>
        {/* Date picker toggle */}
        {user && (
          <div className="flex justify-center items-center gap-2 mb-2">
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="text-xs text-pm-text-muted hover:text-brand cursor-pointer"
            >
              {backfillDate
                ? `📅 ${new Date(backfillDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                : (lang === "zh" ? "📅 补录过去" : "📅 Log past day")}
            </button>
            {backfillDate && (
              <button
                onClick={() => { setBackfillDate(""); setShowDatePicker(false); }}
                className="text-xs text-pm-text-muted hover:text-red-400 cursor-pointer"
              >
                ×
              </button>
            )}
          </div>
        )}
        {showDatePicker && (
          <div className="mb-3">
            <input
              type="date"
              value={backfillDate}
              max={new Date().toISOString().split("T")[0]}
              onChange={(e) => { setBackfillDate(e.target.value); setShowDatePicker(false); }}
              className="px-3 py-1.5 rounded-xl bg-pm-surface-active border border-pm-border text-pm-text text-xs focus:outline-none focus:ring-2 focus:ring-brand-light"
            />
          </div>
        )}
        <div className="flex justify-center gap-2 flex-wrap mt-4">
          {moods.map((mood, i) => (
            <button
              key={i}
              onClick={() => user ? selectMood(i) : setSelected(i)}
              disabled={saving}
              className={`flex flex-col items-center gap-1 p-3 rounded-2xl transition-all cursor-pointer ${
                selected === i
                  ? "bg-brand text-white scale-110 shadow-lg"
                  : "bg-pm-surface-active hover:bg-pm-surface-hover"
              }`}
            >
              <span className="text-3xl">{mood.emoji}</span>
              <span className="text-xs font-medium">{t(mood.labelKey)}</span>
            </button>
          ))}
        </div>
        {/* Photo mood detection */}
        {user && (
          <div className="flex justify-center gap-2 mt-3">
            <label className="px-3 py-1.5 rounded-full text-xs bg-pm-surface-active text-pm-text-secondary hover:bg-pm-surface-hover cursor-pointer transition-all">
              📷 {t("mood.photoMood")}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleMoodPhoto(e.target.files[0])}
              />
            </label>
            <label className="px-3 py-1.5 rounded-full text-xs bg-pm-surface-active text-pm-text-secondary hover:bg-pm-surface-hover cursor-pointer transition-all">
              🖼️ {t("mood.uploadMood")}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleMoodPhoto(e.target.files[0])}
              />
            </label>
          </div>
        )}
        {extractingPhoto && (
          <p className="text-xs text-pm-text-muted italic mt-2">{t("mood.readingPhoto")}</p>
        )}
        </>
      )}

      {/* Step 2: What happened? */}
      {step === "trigger" && (
        <TriggerStep
          moods={moods}
          selected={selected}
          selectedTriggers={selectedTriggers}
          customTrigger={customTrigger}
          customTriggers={customTriggers}
          savedTriggers={savedTriggers}
          hiddenTriggerKeys={hiddenTriggerKeys}
          triggerPattern={triggerPattern}
          triggerKeys={TRIGGER_KEYS}
          onSelectMood={setSelected}
          onToggleTrigger={toggleTrigger}
          onToggleCustomTrigger={toggleCustomTrigger}
          onCustomTriggerChange={setCustomTrigger}
          onAddSaved={(label) => addSavedOption("trigger", label)}
          onDeleteSaved={deleteSavedOption}
          onHidePreset={hidePresetTrigger}
          onShowAllPresets={showAllPresets}
          onNext={() => setStep("helped")}
          onSkip={() => { setSelectedTriggers([]); setCustomTrigger(""); setStep("helped"); }}
        />
      )}

      {/* Step 3: What helped? */}
      {step === "helped" && selected !== null && (
        <div className="mt-4 max-w-sm md:max-w-lg mx-auto">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-2xl">{moods[selected].emoji}</span>
            <p className="text-sm text-pm-text-secondary font-medium">
              {t("mood.whatHelped")}
            </p>
          </div>

          {/* Saved custom helped */}
          {savedHelped.length > 0 && (
            <div className="flex flex-wrap gap-1.5 justify-center mb-2">
              {savedHelped.map((opt) => (
                <div key={opt.id} className="relative">
                  <button
                    onClick={() => {
                      if (selectedHelped.includes(`saved:${opt.label}`)) {
                        setSelectedHelped((prev) => prev.filter((k) => k !== `saved:${opt.label}`));
                      } else {
                        setSelectedHelped((prev) => [...prev, `saved:${opt.label}`]);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                      selectedHelped.includes(`saved:${opt.label}`) ? "bg-brand text-white" : "bg-pm-accent-light text-brand hover:bg-pm-accent"
                    }`}
                  >
                    {opt.label}
                  </button>
                  {showAddHelped && (
                    <button
                      onClick={() => deleteSavedOption(opt.id)}
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-400 text-white text-[10px] flex items-center justify-center cursor-pointer"
                    >×</button>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2 justify-center mb-2">
            {/* AI suggestion from photo */}
            {photoSuggestion && (
              <button
                onClick={() => setCustomHelped(photoSuggestion)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  customHelped === photoSuggestion
                    ? "bg-brand text-white"
                    : "bg-pm-accent-light text-brand hover:bg-pm-accent"
                }`}
              >
                ✨ {photoSuggestion}
              </button>
            )}
            {HELPED_KEYS.map((key) => (
              <button
                key={key}
                onClick={() => toggleHelped(key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  selectedHelped.includes(key)
                    ? "bg-brand text-white"
                    : "bg-pm-surface-active text-pm-text-secondary hover:bg-pm-surface-hover"
                }`}
              >
                {t(key)}
              </button>
            ))}
          </div>

          {/* Add / Manage helped */}
          <div className="flex justify-center gap-2 mb-3">
            <button
              onClick={() => { setShowAddHelped(!showAddHelped); setNewHelpedInput(""); }}
              className="text-[10px] text-pm-text-muted hover:text-brand cursor-pointer"
            >
              {showAddHelped ? (lang === "zh" ? "完成" : "Done") : `+ ${lang === "zh" ? "添加标签" : "Add tag"}`}
            </button>
          </div>

          {showAddHelped && (
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newHelpedInput}
                onChange={(e) => setNewHelpedInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newHelpedInput.trim()) {
                    addSavedOption("helped", newHelpedInput.trim());
                    setNewHelpedInput("");
                  }
                }}
                placeholder={lang === "zh" ? "输入新标签..." : "New helped tag..."}
                className="flex-1 px-3 py-1.5 rounded-xl bg-pm-surface-active border border-pm-border text-pm-text text-xs focus:outline-none focus:ring-2 focus:ring-brand-light"
                autoFocus
              />
              <button
                onClick={() => { if (newHelpedInput.trim()) { addSavedOption("helped", newHelpedInput.trim()); setNewHelpedInput(""); } }}
                disabled={!newHelpedInput.trim()}
                className="px-3 py-1.5 rounded-full text-xs bg-brand text-white cursor-pointer disabled:opacity-40"
              >
                {lang === "zh" ? "保存" : "Save"}
              </button>
            </div>
          )}

          <input
            type="text"
            placeholder={lang === "zh" ? "或输入其他方法..." : "Or type what helped..."}
            value={customHelped}
            onChange={(e) => setCustomHelped(e.target.value)}
            className="w-full px-4 py-2 rounded-xl bg-pm-surface-active border border-pm-border text-pm-text text-xs placeholder-pm-placeholder focus:outline-none focus:ring-2 focus:ring-brand-light mb-4"
          />
          <div className="flex justify-center gap-3">
            <button
              onClick={saveMood}
              disabled={saving}
              className="px-6 py-2 rounded-full text-xs font-medium bg-brand text-white cursor-pointer disabled:opacity-40"
            >
              {saving ? "..." : t("mood.done")}
            </button>
            <button
              onClick={() => { setSelectedHelped([]); setCustomHelped(""); saveMood(); }}
              disabled={saving}
              className="px-6 py-2 rounded-full text-xs font-medium bg-pm-surface-active text-pm-text-secondary cursor-pointer"
            >
              {t("mood.skip")}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: AI Response */}
      {step === "done" && selected !== null && (
        <div className="mt-4 max-w-xs mx-auto">
          <p className="text-3xl mb-3">{moods[selected].emoji}</p>
          {loadingAi ? (
            <p className="text-xs text-pm-text-muted italic">
              {lang === "zh" ? "思考中..." : "Thinking..."}
            </p>
          ) : aiResponse ? (
            <div className="bg-pm-surface rounded-2xl p-4">
              <p className="text-sm text-pm-text-secondary leading-relaxed">{aiResponse}</p>
            </div>
          ) : (
            <p className="text-sm text-pm-text-secondary">
              {t(moods[selected].responseKey)}
            </p>
          )}
          {/* Layer 1: Grow suggestion for low/struggling moods */}
          {selected !== null && selected >= 3 && buildTriggerString() && onNavigateToGrow && (
            <button
              onClick={() => {
                const triggerStr = buildTriggerString();
                const helpedLabels = selectedHelped.map((k) => t(k)).join(", ");
                onNavigateToGrow({
                  trigger: triggerStr,
                  moodLabel: moods[selected].label,
                  moodEmoji: moods[selected].emoji,
                  helped: helpedLabels || null,
                  source: "mood-done",
                });
              }}
              className="mt-3 px-4 py-2 rounded-full text-xs bg-pm-accent-light text-brand hover:bg-pm-accent cursor-pointer transition-all"
            >
              {t("mood.growSuggestion")} 🌱
            </button>
          )}
          {/* Wellness nudge */}
          {wellnessNudge && (
            <div className="mt-4 bg-pm-accent-light/70 rounded-2xl p-3 text-left">
              <p className="text-xs text-pm-text-secondary leading-relaxed">
                {lang === "zh"
                  ? "我们注意到你最近情绪偏低。做一个简单的自我评估，也许能帮助你更好地了解自己。"
                  : "We've noticed you've been feeling low lately. A quick self check-in might help you understand how you're doing."}
              </p>
              <button
                onClick={() => {
                  resetFlow();
                  onSuggestAssessment?.(wellnessNudge);
                }}
                className="mt-2 px-4 py-1.5 rounded-full text-xs bg-brand text-white cursor-pointer"
              >
                {wellnessNudge === "phq9"
                  ? (lang === "zh" ? "🌧️ 抑郁自评" : "🌧️ Depression Check-In")
                  : (lang === "zh" ? "🌊 焦虑自评" : "🌊 Anxiety Check-In")}
              </button>
            </div>
          )}
          <button
            onClick={resetFlow}
            className="mt-3 text-xs text-pm-text-muted hover:text-brand cursor-pointer"
          >
            {lang === "zh" ? "完成" : "Done"}
          </button>
        </div>
      )}

      {/* Not logged in */}
      {!user && selected !== null && step === "mood" && (
        <>
          <p className="mt-4 text-sm text-pm-text-secondary max-w-xs mx-auto">
            {t(moods[selected].responseKey)}
          </p>
          <p className="mt-2 text-sm text-pm-text-muted">{t("mood.signIn")}</p>
        </>
      )}

      {user && history.length > 0 && step === "mood" && (
        <MoodChart
          history={history}
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
        />
      )}

      {user && history.length > 0 && step === "mood" && (
        <MoodHistoryList
          history={history}
          photoUrls={photoUrls}
          onDeleteMood={deleteMood}
          onDeletePhoto={deleteEntryPhoto}
          onNavigateToGrow={onNavigateToGrow}
        />
      )}
    </section>
  );
}
