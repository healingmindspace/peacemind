"use client";

import { useMemo, useState } from "react";

interface CalendarTask {
  id: string;
  title: string;
  due_date: string | null;
  schedule_type: string;
  schedule_rule: { freq?: string; time?: string } | null;
  duration: number | null;
  completed: boolean;
  goal_icon?: string;
}

interface WeekCalendarProps {
  tasks: CalendarTask[];
  onRemove?: (taskId: string) => void;
}

type ViewMode = "week" | "month";

export default function WeekCalendar({ tasks, onRemove }: WeekCalendarProps) {
  const [view, setView] = useState<ViewMode>("week");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [monthOffset, setMonthOffset] = useState(0);

  const today = new Date();

  const days = useMemo(() => {
    const result: Date[] = [];
    const numDays = view === "week" ? 7 : 30;
    for (let i = 0; i < numDays; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      result.push(d);
    }
    return result;
  }, [view]);

  // Month grid
  const monthData = useMemo(() => {
    const ref = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    const year = ref.getFullYear();
    const month = ref.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const label = ref.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    return { year, month, firstDay, daysInMonth, label };
  }, [monthOffset]);

  // Group tasks by day key
  const tasksByDay = useMemo(() => {
    const map = new Map<string, { time: string; task: CalendarTask }[]>();

    // Initialize days
    if (view === "week") {
      for (const day of days) map.set(day.toDateString(), []);
    } else {
      for (let d = 1; d <= monthData.daysInMonth; d++) {
        map.set(new Date(monthData.year, monthData.month, d).toDateString(), []);
      }
    }

    for (const task of tasks) {
      if (task.completed) continue;

      // One-time tasks
      if (task.due_date) {
        const d = new Date(task.due_date);
        const dayKey = d.toDateString();
        if (map.has(dayKey)) {
          const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
          map.get(dayKey)!.push({ time, task });
        }
      }

      // Habits
      if (task.schedule_type === "habit" && task.schedule_rule?.time) {
        const [h, m] = task.schedule_rule.time.split(":");
        const timeStr = new Date(0, 0, 0, parseInt(h), parseInt(m)).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
        const allDays = view === "week" ? days : Array.from({ length: monthData.daysInMonth }, (_, i) => new Date(monthData.year, monthData.month, i + 1));
        for (const day of allDays) {
          const dow = day.getDay();
          const freq = task.schedule_rule!.freq;
          if (freq === "daily" ||
              (freq === "weekdays" && dow >= 1 && dow <= 5) ||
              (freq === "weekly" && dow === today.getDay())) {
            const dayKey = day.toDateString();
            if (map.has(dayKey) && !map.get(dayKey)!.find((e) => e.task.id === task.id)) {
              map.get(dayKey)!.push({ time: timeStr, task });
            }
          }
        }
      }
    }

    for (const [, entries] of map) {
      entries.sort((a, b) => a.time.localeCompare(b.time));
    }

    return map;
  }, [tasks, days, view, monthData]);

  // Overdue tasks
  const overdueTasks = useMemo(() => {
    const todayStr = today.toDateString();
    return tasks.filter((t) =>
      !t.completed && t.due_date && new Date(t.due_date).toDateString() !== todayStr && new Date(t.due_date) < today
    );
  }, [tasks]);

  const isToday = (d: Date) => d.toDateString() === today.toDateString();
  const isTomorrow = (d: Date) => d.toDateString() === new Date(Date.now() + 86400000).toDateString();

  const renderTaskRow = (time: string, task: CalendarTask, dayKey: string) => (
    <div key={`${dayKey}-${task.id}`} className="group flex items-center gap-2">
      <span className="text-[10px] text-pm-text-muted w-14 text-right flex-shrink-0">{time}</span>
      <div className={`flex-1 px-2 py-1 rounded-lg text-xs truncate ${
        task.schedule_type === "habit"
          ? "bg-pm-accent text-pm-text-secondary"
          : "bg-brand-light text-white"
      }`}>
        {task.goal_icon && <span>{task.goal_icon} </span>}{task.title}
        {task.duration ? <span className="opacity-60"> · {task.duration}m</span> : ""}
      </div>
      {onRemove && (
        <button onClick={() => onRemove(task.id)} className="text-xs text-pm-text-muted hover:text-red-400 cursor-pointer px-1 flex-shrink-0">✕</button>
      )}
    </div>
  );

  return (
    <div className="bg-pm-surface rounded-2xl p-3 space-y-2">
      {/* View toggle */}
      <div className="flex items-center justify-between">
        {view === "month" && (
          <div className="flex items-center gap-2">
            <button onClick={() => setMonthOffset((p) => p - 1)} className="text-xs text-pm-text-muted hover:text-brand cursor-pointer">◀</button>
            <span className="text-xs font-semibold text-pm-text">{monthData.label}</span>
            <button onClick={() => setMonthOffset((p) => p + 1)} className="text-xs text-pm-text-muted hover:text-brand cursor-pointer">▶</button>
          </div>
        )}
        {view === "week" && <span />}
        <div className="flex gap-1">
          <button
            onClick={() => { setView("week"); setSelectedDate(null); setMonthOffset(0); }}
            className={`px-2 py-0.5 rounded-full text-[10px] cursor-pointer ${view === "week" ? "bg-brand text-white" : "bg-pm-surface-active text-pm-text-muted"}`}
          >
            Week
          </button>
          <button
            onClick={() => { setView("month"); setSelectedDate(null); }}
            className={`px-2 py-0.5 rounded-full text-[10px] cursor-pointer ${view === "month" ? "bg-brand text-white" : "bg-pm-surface-active text-pm-text-muted"}`}
          >
            Month
          </button>
        </div>
      </div>

      {/* Overdue */}
      {overdueTasks.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold mb-1 text-red-400">Overdue</p>
          <div className="space-y-1">
            {overdueTasks.map((task) => (
              <div key={`overdue-${task.id}`} className="group flex items-center gap-2">
                <span className="text-[10px] text-red-300 w-14 text-right flex-shrink-0">
                  {new Date(task.due_date!).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
                <div className="flex-1 px-2 py-1 rounded-lg text-xs truncate bg-red-50 text-red-400 border border-red-200">
                  {task.goal_icon && <span>{task.goal_icon} </span>}{task.title}
                </div>
                {onRemove && (
                  <button onClick={() => onRemove(task.id)} className="text-xs text-pm-text-muted hover:text-red-400 cursor-pointer px-1 flex-shrink-0">✕</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Week view */}
      {view === "week" && days.map((day) => {
        const entries = tasksByDay.get(day.toDateString()) || [];
        if (entries.length === 0) return null;
        const dayLabel = isToday(day) ? "Today" : isTomorrow(day) ? "Tomorrow" : day.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
        return (
          <div key={day.toDateString()}>
            <p className={`text-[10px] font-semibold mb-1 ${isToday(day) ? "text-brand" : "text-pm-text-tertiary"}`}>{dayLabel}</p>
            <div className="space-y-1">
              {entries.map(({ time, task }) => renderTaskRow(time, task, day.toDateString()))}
            </div>
          </div>
        );
      })}

      {/* Month view — calendar grid */}
      {view === "month" && (
        <>
          <div className="grid grid-cols-7 gap-px text-center">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <span key={i} className="text-[9px] text-pm-text-muted py-1">{d}</span>
            ))}
            {Array.from({ length: monthData.firstDay }, (_, i) => (
              <span key={`empty-${i}`} />
            ))}
            {Array.from({ length: monthData.daysInMonth }, (_, i) => {
              const d = new Date(monthData.year, monthData.month, i + 1);
              const dayKey = d.toDateString();
              const entries = tasksByDay.get(dayKey) || [];
              const isTodayDate = dayKey === today.toDateString();
              const isSelected = dayKey === selectedDate;
              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(isSelected ? null : dayKey)}
                  className={`py-1 rounded-lg text-[10px] cursor-pointer transition-all relative ${
                    isSelected ? "bg-brand text-white" : isTodayDate ? "bg-brand-light/20 text-brand font-bold" : "text-pm-text-secondary hover:bg-pm-surface-active"
                  }`}
                >
                  {i + 1}
                  {entries.length > 0 && (
                    <span className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${isSelected ? "bg-white" : "bg-brand"}`} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Selected day's tasks */}
          {selectedDate && (() => {
            const entries = tasksByDay.get(selectedDate) || [];
            const d = new Date(selectedDate);
            const label = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
            return (
              <div className="mt-2">
                <p className="text-[10px] font-semibold text-pm-text-tertiary mb-1">{label}</p>
                {entries.length === 0 ? (
                  <p className="text-[10px] text-pm-text-muted italic">No events</p>
                ) : (
                  <div className="space-y-1">
                    {entries.map(({ time, task }) => renderTaskRow(time, task, selectedDate))}
                  </div>
                )}
              </div>
            );
          })()}
        </>
      )}

      {/* Empty state */}
      {view === "week" && !overdueTasks.length && !Array.from(tasksByDay.values()).some((v) => v.length > 0) && (
        <p className="text-xs text-pm-text-muted text-center py-2">No events this week</p>
      )}
    </div>
  );
}
