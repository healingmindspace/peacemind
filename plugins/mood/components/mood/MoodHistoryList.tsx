"use client";

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
  onNavigateToGrow?: (intent: GrowIntent) => void;
}

export default function MoodHistoryList({ history, photoUrls, onDeleteMood, onDeletePhoto, onNavigateToGrow }: MoodHistoryListProps) {
  const { t } = useI18n();

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  };

  return (
    <div className="mt-6 max-w-sm md:max-w-lg mx-auto">
      <h3 className="text-sm font-semibold text-pm-text mb-3">{t("mood.recent")}</h3>
      <div className="space-y-2">
        {history.map((entry) => (
          <div key={entry.id} className="group bg-pm-surface-active rounded-xl px-3 py-2 text-sm flex items-center gap-2">
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
            {entry.trigger && onNavigateToGrow && (
              <button
                onClick={() => onNavigateToGrow({ trigger: entry.trigger!, moodLabel: entry.label, moodEmoji: entry.emoji, helped: entry.helped, source: "mood-history" })}
                className="opacity-40 hover:opacity-100 transition-opacity cursor-pointer text-sm"
                title={t("mood.growFromHistory")}
              >🌱</button>
            )}
            <button onClick={() => onDeleteMood(entry.id)} className="opacity-40 md:opacity-0 md:group-hover:opacity-100 transition-opacity text-pm-text-muted hover:text-red-400 cursor-pointer text-xs">x</button>
          </div>
        ))}
      </div>
    </div>
  );
}
