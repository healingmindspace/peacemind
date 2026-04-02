"use client";

import { useI18n } from "@/lib/i18n";

interface AddTaskFormProps {
  newTaskTitle: string;
  newTaskDesc: string;
  newTaskDate: string;
  newTaskTime: string;
  newScheduleType: "once" | "habit" | "gentle";
  newHabitFreq: string;
  newDuration: string;
  saving: boolean;
  onTitleChange: (v: string) => void;
  onDescChange: (v: string) => void;
  onTitleBlur: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export default function AddTaskForm({
  newTaskTitle, newTaskDesc, newTaskDate, newTaskTime,
  newScheduleType, newHabitFreq, newDuration, saving,
  onTitleChange, onDescChange, onTitleBlur, onSave, onCancel,
}: AddTaskFormProps) {
  const { t } = useI18n();

  return (
    <div className="mt-3 space-y-2">
      <input
        type="text"
        value={newTaskTitle}
        onChange={(e) => onTitleChange(e.target.value)}
        onBlur={(e) => onTitleBlur(e.target.value)}
        placeholder={t("tasks.titleField")}
        className="w-full px-3 py-1.5 rounded-xl bg-pm-surface-active border border-pm-border text-pm-text text-xs focus:outline-none focus:ring-2 focus:ring-brand-light"
        autoFocus
      />
      <textarea
        value={newTaskDesc}
        onChange={(e) => onDescChange(e.target.value)}
        placeholder={t("tasks.descriptionField")}
        rows={2}
        className="w-full px-3 py-1.5 rounded-xl bg-pm-surface-active border border-pm-border text-pm-text text-xs focus:outline-none focus:ring-2 focus:ring-brand-light resize-none"
      />

      {/* Smart-detected schedule preview */}
      {(newTaskDate || newScheduleType === "habit" || newDuration) && (
        <div className="bg-pm-accent-light/50 rounded-xl px-3 py-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {newTaskDate && (
              <span className="text-[10px] text-pm-text-secondary">
                📅 {new Date(newTaskDate + "T00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              </span>
            )}
            {newTaskTime && (
              <span className="text-[10px] text-pm-text-secondary">
                🕐 {new Date(`2000-01-01T${newTaskTime}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
              </span>
            )}
            {newScheduleType === "habit" && (
              <span className="text-[10px] text-pm-text-secondary">
                🔄 {newHabitFreq === "daily" ? t("tasks.daily") : newHabitFreq === "weekdays" ? t("tasks.weekdays") : t("tasks.weekly")}
              </span>
            )}
            {newDuration && (
              <span className="text-[10px] text-pm-text-secondary">⏱ {newDuration}{t("tasks.min")}</span>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={onSave} disabled={saving || !newTaskTitle.trim()} className="px-3 py-1 rounded-full text-xs bg-brand text-white cursor-pointer disabled:opacity-40">{t("tasks.save")}</button>
        <button onClick={onCancel} className="px-3 py-1 rounded-full text-xs bg-pm-surface-active text-pm-text-secondary cursor-pointer">{t("tasks.cancel")}</button>
      </div>
    </div>
  );
}
