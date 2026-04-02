"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { uploadPhoto, getSignedUrls } from "@/lib/photos-api";
import { useI18n } from "@/lib/i18n";
import JournalHistory from "./journal/JournalHistory";

interface Goal {
  id: string;
  name: string;
  icon: string;
}

interface JournalEntry {
  id: string;
  photo_path: string | null;
  content: string;
  response: string | null;
  liked: boolean;
  goal_id: string | null;
  parent_id: string | null;
  created_at: string;
}

async function journalApi(body: Record<string, unknown>) {
  const res = await fetch("/api/journal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

const SUGGESTED_PATHS = [
  { id: "s:work", name: "Work", nameZh: "工作", icon: "🌿" },
  { id: "s:life", name: "Life", nameZh: "生活", icon: "🌸" },
  { id: "s:exercise", name: "Exercise", nameZh: "运动", icon: "🌊" },
  { id: "s:school", name: "School", nameZh: "学业", icon: "🌻" },
  { id: "s:growth", name: "Growth", nameZh: "成长", icon: "🍃" },
];

interface GrowIntent {
  trigger: string;
  source: "mood-done" | "mood-history" | "journal-history";
}

export default function GratitudeJournal({ goals = [], onNavigateToGrow }: { goals?: Goal[]; onNavigateToGrow?: (intent: GrowIntent) => void }) {
  const [content, setContent] = useState("");
  const { user, accessToken } = useAuth();
  const [history, setHistory] = useState<JournalEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [backfillDate, setBackfillDate] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<string>(""); // goal id or "s:xxx" for suggested
  const [customPath, setCustomPath] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const { t, lang } = useI18n();

  const handlePhoto = async (file: File) => {
    if (!file || !file.type.startsWith("image/")) return;
    setExtracting(true);
    try {
      const { resizeImage } = await import("@/lib/resize-image");
      const base64 = await resizeImage(file);
      const res = await fetch("/api/extract-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, lang }),
      });
      const data = await res.json();
      if (data.text) {
        setContent((prev) => prev ? `${prev}\n\n${data.text}` : data.text);
        setPendingPhoto(file);
      }
    } catch { /* ignore */ }
    setExtracting(false);
  };

  useEffect(() => {
    if (user && accessToken) loadHistory(user.id, accessToken);
    else setHistory([]);
  }, [user, accessToken]);

  const loadHistory = async (userId: string, token?: string) => {
    const tk = token || accessToken;
    if (!tk) return;
    const res = await journalApi({ action: "list", userId, accessToken: tk });
    if (res.data) setHistory(res.data);
  };

  // Load signed URLs for photos
  useEffect(() => {
    const paths = history.filter((e) => e.photo_path).map((e) => e.photo_path!);
    if (paths.length === 0 || !accessToken) return;
    const newPaths = paths.filter((p) => !photoUrls[p]);
    if (newPaths.length === 0) return;
    getSignedUrls(accessToken, newPaths).then((urls) => {
      setPhotoUrls((prev) => ({ ...prev, ...urls }));
    });
  }, [history]);

  const save = async () => {
    if (!user || !content.trim() || !accessToken) return;

    setSaving(true);
    const savedContent = content.trim();

    // Resolve goalId — if a suggested path is selected, use null (no DB goal)
    let resolvedGoalId: string | null = null;
    if (selectedGoal && !selectedGoal.startsWith("s:")) {
      resolvedGoalId = selectedGoal;
    }

    // Upload photo if exists
    let photoPath: string | null = null;
    if (pendingPhoto) {
      photoPath = await uploadPhoto(accessToken, pendingPhoto, `${user.id}/journal`);
    }

    const insertData: Record<string, unknown> = {
      action: "insert",
      userId: user.id,
      content: savedContent,
      accessToken,
      goalId: resolvedGoalId,
      photoPath,
    };
    if (backfillDate) {
      insertData.createdAt = new Date(backfillDate + "T12:00:00").toISOString();
    }
    const res = await journalApi(insertData);

    if (res.id) {
      setContent("");
      loadHistory(user.id);

      fetch("/api/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: savedContent }),
      })
        .then((r) => r.ok ? r.json() : null)
        .then(async (data) => {
          if (data?.response) {
            await journalApi({
              action: "update_response",
              userId: user.id,
              id: res.id,
              response: data.response,
              accessToken,
            });
            loadHistory(user.id);
          }
        })
        .catch(async () => {
          await journalApi({
            action: "update_response",
            userId: user.id,
            id: res.id,
            response: "💜",
            accessToken,
          });
          loadHistory(user.id);
        });
    }

    setSaving(false);
    setBackfillDate("");
    setShowDatePicker(false);
    setSelectedGoal("");
    setCustomPath("");
    setPendingPhoto(null);
  };

  const updateEntry = async (id: string, newContent: string) => {
    if (!user || !newContent.trim() || !accessToken) return;
    const savedEdit = newContent.trim();

    await journalApi({
      action: "update_content",
      userId: user.id,
      id,
      content: savedEdit,
      accessToken,
    });

    loadHistory(user.id);

    fetch("/api/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: savedEdit }),
    })
      .then((r) => r.ok ? r.json() : null)
      .then(async (data) => {
        if (data?.response) {
          await journalApi({
            action: "update_response",
            userId: user.id,
            id,
            response: data.response,
            accessToken,
          });
          loadHistory(user.id);
        }
      })
      .catch(() => {});
  };

  const toggleLike = async (id: string, currentLiked: boolean) => {
    if (!user || !accessToken) return;
    await journalApi({
      action: "update_liked",
      userId: user.id,
      id,
      liked: !currentLiked,
      accessToken,
    });
    loadHistory(user.id);
  };

  const saveReply = async (parentId: string, replyText: string) => {
    if (!user || !replyText.trim() || !accessToken) return;
    setSaving(true);
    const savedContent = replyText.trim();
    const res = await journalApi({
      action: "insert",
      userId: user.id,
      content: savedContent,
      accessToken,
      parentId,
    });

    if (res.id) {
      loadHistory(user.id);

      // Get AI response for the update too
      fetch("/api/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: savedContent }),
      })
        .then((r) => r.ok ? r.json() : null)
        .then(async (data) => {
          if (data?.response) {
            await journalApi({
              action: "update_response",
              userId: user.id,
              id: res.id,
              response: data.response,
              accessToken,
            });
            loadHistory(user.id);
          }
        })
        .catch(() => {});
    }
    setSaving(false);
  };

  const deleteEntry = async (id: string) => {
    if (!user || !accessToken) return;
    await journalApi({ action: "delete", userId: user.id, id, accessToken });
    loadHistory(user.id);
  };

  return (
    <section className="py-6 px-4 text-center">
      <h2 className="text-xl font-semibold text-pm-text mb-1">{t("journal.title")}</h2>
      <p className="text-sm text-pm-text-secondary mb-6">{t("journal.subtitle")}</p>
      <div className="max-w-sm md:max-w-lg mx-auto">
        {/* Date picker for backfill */}
        {user && (
          <div className="flex justify-center items-center gap-2 mb-3">
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
          <div className="mb-3 text-center">
            <input
              type="date"
              value={backfillDate}
              max={new Date().toISOString().split("T")[0]}
              onChange={(e) => { setBackfillDate(e.target.value); setShowDatePicker(false); }}
              className="px-3 py-1.5 rounded-xl bg-pm-surface-active border border-pm-border text-pm-text text-xs focus:outline-none focus:ring-2 focus:ring-brand-light"
            />
          </div>
        )}
        <textarea
          placeholder={t("journal.placeholder")}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          className="w-full px-4 py-3 rounded-2xl bg-pm-surface-active backdrop-blur-sm border border-pm-border text-pm-text placeholder-pm-placeholder focus:outline-none focus:ring-2 focus:ring-brand-light resize-none text-sm"
        />
        {/* Photo input */}
        {user && (
          <div className="flex items-center gap-2 mt-2">
            <label className="px-3 py-1.5 rounded-full text-xs bg-pm-surface-active text-pm-text-secondary hover:bg-pm-surface-hover cursor-pointer transition-all">
              📷 {t("journal.takePhoto")}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handlePhoto(e.target.files[0])}
              />
            </label>
            <label className="px-3 py-1.5 rounded-full text-xs bg-pm-surface-active text-pm-text-secondary hover:bg-pm-surface-hover cursor-pointer transition-all">
              🖼️ {t("journal.uploadPhoto")}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handlePhoto(e.target.files[0])}
              />
            </label>
            {extracting && (
              <span className="text-xs text-pm-text-muted italic">{t("journal.extracting")}</span>
            )}
          </div>
        )}
        {user && (
          <div className="flex flex-wrap justify-center gap-1.5 mt-3">
            {/* User's goals first */}
            {goals.map((g) => (
              <button
                key={g.id}
                onClick={() => { setSelectedGoal(selectedGoal === g.id ? "" : g.id); setCustomPath(""); }}
                className={`px-3 py-1 rounded-full text-xs cursor-pointer transition-all ${
                  selectedGoal === g.id
                    ? "bg-brand text-white"
                    : "bg-pm-surface-active text-pm-text-secondary hover:bg-pm-surface-hover"
                }`}
              >
                {g.icon} {g.name}
              </button>
            ))}
            {/* Suggested paths (only show ones not already in user goals) */}
            {SUGGESTED_PATHS
              .filter((s) => !goals.some((g) => g.name.toLowerCase() === s.name.toLowerCase()))
              .map((s) => (
                <button
                  key={s.id}
                  onClick={() => { setSelectedGoal(selectedGoal === s.id ? "" : s.id); setCustomPath(""); }}
                  className={`px-3 py-1 rounded-full text-xs cursor-pointer transition-all ${
                    selectedGoal === s.id
                      ? "bg-brand text-white"
                      : "bg-pm-accent-light text-pm-text-tertiary hover:bg-pm-accent"
                  }`}
                >
                  {s.icon} {lang === "zh" ? s.nameZh : s.name}
                </button>
              ))}
          </div>
        )}
        <button
          onClick={save}
          disabled={saving || !content.trim() || !user}
          className="mt-3 px-8 py-2.5 rounded-full bg-brand text-white text-sm font-medium hover:bg-brand-hover transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? t("journal.saving") : t("journal.save")}
        </button>

        {!user && (
          <p className="mt-3 text-xs text-pm-text-muted">{t("journal.signIn")}</p>
        )}

        {user && history.length > 0 && (
          <JournalHistory
            history={history}
            goals={goals}
            photoUrls={photoUrls}
            saving={saving}
            userId={user.id}
            onToggleLike={toggleLike}
            onUpdateEntry={(id, content) => updateEntry(id, content)}
            onDeleteEntry={deleteEntry}
            onSaveReply={(parentId, content) => saveReply(parentId, content)}
            onLoadHistory={loadHistory}
            onNavigateToGrow={onNavigateToGrow}
          />
        )}
      </div>
    </section>
  );
}
