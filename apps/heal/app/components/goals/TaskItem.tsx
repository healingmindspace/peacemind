"use client";

import { useI18n } from "@/lib/i18n";
import type { Task } from "./types";

interface TaskItemProps {
  task: Task;
  isEditing: boolean;
  editTitle: string;
  editDesc: string;
  editDue: string;
  saving: boolean;
  isScheduling: boolean;
  scheduleDate: string;
  scheduleTime: string;
  onEditTitleChange: (v: string) => void;
  onEditDescChange: (v: string) => void;
  onToggle: () => void;
  onSave: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onScheduleDateChange: (v: string) => void;
  onScheduleTimeChange: (v: string) => void;
  onStartSchedule: () => void;
  onConfirmSchedule: () => void;
  onCancelSchedule: () => void;
  onUnschedule: () => void;
  formatDue: (dateStr: string) => { text: string; isOverdue: boolean };
  formatSchedule: (task: Task) => string;
}

export default function TaskItem({
  task, isEditing, editTitle, editDesc, editDue, saving,
  isScheduling, scheduleDate, scheduleTime,
  onEditTitleChange, onEditDescChange, onToggle, onSave,
  onStartEdit, onCancelEdit, onDelete,
  onScheduleDateChange, onScheduleTimeChange,
  onStartSchedule, onConfirmSchedule, onCancelSchedule, onUnschedule,
  formatDue, formatSchedule,
}: TaskItemProps) {
  const { t } = useI18n();

  if (isEditing) {
    return (
      <div className="group flex items-start gap-2">
        <div className="flex-1 space-y-2">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => onEditTitleChange(e.target.value)}
            className="w-full px-3 py-1.5 rounded-xl bg-pm-surface-active border border-pm-border text-pm-text text-xs focus:outline-none focus:ring-2 focus:ring-brand-light"
          />
          <textarea
            value={editDesc}
            onChange={(e) => onEditDescChange(e.target.value)}
            placeholder={t("tasks.descriptionField")}
            rows={2}
            className="w-full px-3 py-1.5 rounded-xl bg-pm-surface-active border border-pm-border text-pm-text text-xs focus:outline-none focus:ring-2 focus:ring-brand-light resize-none"
          />
          {editDue && (
            <p className="text-[10px] text-pm-text-muted">📅 {new Date(editDue).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p>
          )}
          <div className="flex gap-2">
            <button onClick={onSave} disabled={saving} className="px-3 py-1 rounded-full text-xs bg-brand text-white cursor-pointer disabled:opacity-40">{t("tasks.save")}</button>
            <button onClick={onCancelEdit} className="px-3 py-1 rounded-full text-xs bg-pm-surface-active text-pm-text-secondary cursor-pointer">{t("tasks.cancel")}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group">
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={task.completed}
          onChange={onToggle}
          className="mt-1 cursor-pointer accent-brand"
        />
        <div className="flex-1 min-w-0">
          <p className={`text-sm text-pm-text ${task.completed ? "line-through opacity-50" : ""}`}>
            {task.title}
          </p>
          {task.description && (
            <p className="text-xs text-pm-text-tertiary truncate">{task.description}</p>
          )}
          {task.due_date && (
            <p className={`text-[10px] ${formatDue(task.due_date).isOverdue && !task.completed ? "text-red-400" : "text-pm-text-muted"}`}>
              {formatDue(task.due_date).text}
            </p>
          )}
          {(task.schedule_type === "habit" || task.schedule_type === "gentle" || task.duration) && (
            <p className="text-[10px] text-pm-text-muted">
              {formatSchedule(task)}
            </p>
          )}
        </div>
        {/* Schedule button */}
        <button
          onClick={onStartSchedule}
          className={`text-sm px-1.5 py-0.5 rounded-lg cursor-pointer transition-all flex-shrink-0 ${
            task.due_date ? "bg-pm-accent hover:bg-pm-accent" : "bg-pm-surface-active hover:bg-pm-accent opacity-40 hover:opacity-100"
          }`}
          title={task.due_date ? t("tasks.reschedule") : t("tasks.addToCal")}
        >📅</button>
        {/* Edit/delete */}
        <div className="opacity-40 md:opacity-0 md:group-hover:opacity-100 flex gap-1 transition-opacity flex-shrink-0">
          <button onClick={onStartEdit} className="text-[10px] text-pm-text-muted hover:text-brand cursor-pointer">{t("tasks.edit")}</button>
          <button onClick={onDelete} className="text-[10px] text-pm-text-muted hover:text-red-400 cursor-pointer">{t("tasks.delete")}</button>
        </div>
      </div>

      {/* Inline date/time picker */}
      {isScheduling && (
        <div className="mt-2 ml-6 bg-pm-accent-light/50 rounded-xl px-3 py-2 space-y-2">
          <div className="flex gap-2">
            <input
              type="date"
              value={scheduleDate}
              onChange={(e) => onScheduleDateChange(e.target.value)}
              className="flex-1 px-2 py-1 rounded-lg bg-pm-surface-active border border-pm-border text-pm-text text-xs focus:outline-none focus:ring-2 focus:ring-brand-light"
            />
            <input
              type="time"
              value={scheduleTime}
              onChange={(e) => onScheduleTimeChange(e.target.value)}
              className="px-2 py-1 rounded-lg bg-pm-surface-active border border-pm-border text-pm-text text-xs focus:outline-none focus:ring-2 focus:ring-brand-light"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={onConfirmSchedule} disabled={!scheduleDate} className="px-3 py-1 rounded-full text-xs bg-brand text-white cursor-pointer disabled:opacity-40">{t("tasks.save")}</button>
            {task.due_date && (
              <button onClick={onUnschedule} className="px-3 py-1 rounded-full text-xs bg-pm-surface-active text-red-400 cursor-pointer">{t("tasks.remove")}</button>
            )}
            <button onClick={onCancelSchedule} className="px-3 py-1 rounded-full text-xs bg-pm-surface-active text-pm-text-secondary cursor-pointer">{t("tasks.cancel")}</button>
          </div>
        </div>
      )}
    </div>
  );
}
