"use client";

import { useI18n } from "@/lib/i18n";
import type { Goal } from "./types";

interface GrowIntentPickerProps {
  text: string;
  activeGoals: Goal[];
  newPathName: string;
  saving: boolean;
  onSelectPath: (goalId: string) => void;
  onNewPathChange: (v: string) => void;
  onCreatePath: () => void;
  onCancel: () => void;
}

export default function GrowIntentPicker({
  text, activeGoals, newPathName, saving,
  onSelectPath, onNewPathChange, onCreatePath, onCancel,
}: GrowIntentPickerProps) {
  const { t } = useI18n();

  return (
    <div className="bg-pm-accent-light/70 rounded-2xl p-4 mb-4">
      <p className="text-xs text-pm-text-secondary mb-1 font-medium">{t("goals.growContext")}</p>
      <p className="text-xs text-pm-text-tertiary italic mb-3 line-clamp-2">&ldquo;{text}&rdquo;</p>
      <p className="text-xs text-pm-text-secondary mb-2 font-medium">{t("goals.choosePath")}</p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {activeGoals.map((g) => (
          <button
            key={g.id}
            onClick={() => onSelectPath(g.id)}
            className="px-3 py-1.5 rounded-full text-xs bg-pm-surface-active text-pm-text-secondary hover:bg-brand hover:text-white cursor-pointer transition-all"
          >
            {g.icon} {g.name}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={newPathName}
          onChange={(e) => onNewPathChange(e.target.value)}
          placeholder={t("goals.newPathName")}
          className="flex-1 px-3 py-1.5 rounded-xl bg-pm-surface-active border border-pm-border text-pm-text text-xs focus:outline-none focus:ring-2 focus:ring-brand-light"
        />
        <button
          onClick={onCreatePath}
          disabled={saving || !newPathName.trim()}
          className="px-3 py-1.5 rounded-full text-xs bg-brand text-white cursor-pointer disabled:opacity-40"
        >
          {t("goals.createAndPlan")}
        </button>
      </div>
      <button
        onClick={onCancel}
        className="mt-2 text-[10px] text-pm-text-muted hover:text-brand cursor-pointer"
      >
        {t("tasks.cancel")}
      </button>
    </div>
  );
}
