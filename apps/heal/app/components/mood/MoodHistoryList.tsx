"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";

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

interface GrowIntent {
  trigger: string;
  moodLabel?: string;
  moodEmoji?: string;
  helped?: string | null;
  source: "mood-done" | "mood-history" | "journal-history";
}

interface MoodHistoryListProps {
  history: MoodEntry[];
  photoUrls: Record<string, string>;
  onDeleteMood: (id: string) => void;
  onDeletePhoto: (entryId: string, photoPath: string) => void;
  onUpdateMood?: (id: string, trigger: string | null, helped: string | null) => void;
  onNavigateToGrow?: (intent: GrowIntent) => void;
}

export default function MoodHistoryList({ history, photoUrls, onDeleteMood, onDeletePhoto, onUpdateMood, onNavigateToGrow }: MoodHistoryListProps) {
  const { t, lang } = useI18n();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTrigger, setEditTrigger] = useState("");
  const [editHelped, setEditHelped] = useState("");

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  };

  const startEdit = (entry: MoodEntry) => {
    setEditingId(entry.id);
    setEditTrigger(entry.trigger || "");
    setEditHelped(entry.helped || "");
  };

  const saveEdit = () => {
    if (!editingId || !onUpdateMood) return;
    onUpdateMood(editingId, editTrigger.trim() || null, editHelped.trim() || null);
    setEditingId(null);
  };

  return (
    <div className="mt-6 max-w-sm md:max-w-lg mx-auto">
      <h3 className="text-sm font-semibold text-pm-text mb-3">{t("mood.recent")}</h3>
      <div className="space-y-2">
        {history.map((entry) => (
          <div key={entry.id} className="group bg-pm-surface-active rounded-xl px-3 py-2 text-sm">
            {editingId === entry.id ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{entry.emoji}</span>
                  <span className="text-xs text-pm-text-tertiary">{formatDate(entry.created_at)}</span>
                </div>
                <input
                  value={editTrigger}
                  onChange={(e) => setEditTrigger(e.target.value)}
                  placeholder={lang === "zh" ? "发生了什么？" : "What happened?"}
                  className="w-full px-2 py-1 rounded-lg bg-pm-surface border border-pm-border text-xs focus:outline-none focus:ring-2 focus:ring-brand-light"
                  autoFocus
                />
                <input
                  value={editHelped}
                  onChange={(e) => setEditHelped(e.target.value)}
                  placeholder={lang === "zh" ? "什么帮助了你？" : "What helped?"}
                  className="w-full px-2 py-1 rounded-lg bg-pm-surface border border-pm-border text-xs focus:outline-none focus:ring-2 focus:ring-brand-light"
                />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setEditingId(null)} className="text-xs text-pm-text-muted cursor-pointer">
                    {lang === "zh" ? "取消" : "Cancel"}
                  </button>
                  <button onClick={saveEdit} className="text-xs text-brand cursor-pointer">
                    {lang === "zh" ? "保存" : "Save"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xl">{entry.emoji}</span>
                <div className="flex-1 text-left min-w-0">
                  <span className="text-pm-text-tertiary text-xs">{formatDate(entry.created_at)}</span>
                  {entry.trigger && <p className="text-xs text-pm-text-secondary truncate">{entry.trigger}</p>}
                  {entry.helped && <p className="text-xs text-pm-text-muted truncate">→ {entry.helped}</p>}
                  {entry.response && (
                    <p className="text-xs text-pm-text-tertiary italic truncate" title={entry.response}>
                      💬 {entry.response.length > 50 ? entry.response.slice(0, 50) + "..." : entry.response}
                    </p>
                  )}
                  {entry.photo_path && photoUrls[entry.photo_path] && (
                    <div className="flex items-center gap-1 mt-1">
                      <img src={photoUrls[entry.photo_path]} alt="" className="w-10 h-10 rounded-lg object-cover" />
                      <button onClick={(e) => { e.stopPropagation(); onDeletePhoto(entry.id, entry.photo_path!); }} className="text-[10px] text-pm-text-muted hover:text-red-400 cursor-pointer">✕</button>
                    </div>
                  )}
                </div>
                {/* Add details button for entries without trigger */}
                {!entry.trigger && onUpdateMood && (
                  <button
                    onClick={() => startEdit(entry)}
                    className="text-[10px] text-pm-text-muted hover:text-brand cursor-pointer"
                  >
                    {lang === "zh" ? "+ 详情" : "+ Details"}
                  </button>
                )}
                {/* Edit button for entries with trigger */}
                {entry.trigger && onUpdateMood && (
                  <button
                    onClick={() => startEdit(entry)}
                    className="opacity-0 group-hover:opacity-100 text-[10px] text-pm-text-muted hover:text-brand cursor-pointer transition-opacity"
                  >
                    ✏️
                  </button>
                )}
                {entry.trigger && onNavigateToGrow && (
                  <button
                    onClick={() => onNavigateToGrow({ trigger: entry.trigger!, moodLabel: entry.label, moodEmoji: entry.emoji, helped: entry.helped, source: "mood-history" })}
                    className="opacity-40 hover:opacity-100 transition-opacity cursor-pointer text-sm"
                    title={t("mood.growFromHistory")}
                  >🌱</button>
                )}
                <button onClick={() => onDeleteMood(entry.id)} className="opacity-40 md:opacity-0 md:group-hover:opacity-100 transition-opacity text-pm-text-muted hover:text-red-400 cursor-pointer text-xs">x</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
