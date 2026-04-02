"use client";

import { useMemo } from "react";

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

export default function WeekCalendar({ tasks, onRemove }: WeekCalendarProps) {
  const days = useMemo(() => {
    const result: Date[] = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      result.push(d);
    }
    return result;
  }, []);

  // Group tasks by day
  const tasksByDay = useMemo(() => {
    const map = new Map<string, { time: string; task: CalendarTask }[]>();

    for (const day of days) {
      map.set(day.toDateString(), []);
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
        for (const day of days) {
          const dow = day.getDay();
          const freq = task.schedule_rule!.freq;
          if (freq === "daily" ||
              (freq === "weekdays" && dow >= 1 && dow <= 5) ||
              (freq === "weekly" && dow === new Date().getDay())) {
            const dayKey = day.toDateString();
            if (!map.get(dayKey)!.find((e) => e.task.id === task.id)) {
              map.get(dayKey)!.push({ time: timeStr, task });
            }
          }
        }
      }
    }

    // Sort each day's tasks by time
    for (const [, entries] of map) {
      entries.sort((a, b) => a.time.localeCompare(b.time));
    }

    return map;
  }, [tasks, days]);

  const isToday = (d: Date) => d.toDateString() === new Date().toDateString();
  const isTomorrow = (d: Date) => d.toDateString() === new Date(Date.now() + 86400000).toDateString();
  const hasAnyEvents = Array.from(tasksByDay.values()).some((v) => v.length > 0);

  if (!hasAnyEvents) {
    return (
      <div className="bg-pm-surface rounded-2xl p-4 text-center">
        <p className="text-xs text-pm-text-muted">No events this week</p>
      </div>
    );
  }

  return (
    <div className="bg-pm-surface rounded-2xl p-3 space-y-2">
      {days.map((day) => {
        const entries = tasksByDay.get(day.toDateString()) || [];
        if (entries.length === 0) return null;

        const dayLabel = isToday(day) ? "Today" : isTomorrow(day) ? "Tomorrow" : day.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

        return (
          <div key={day.toDateString()}>
            <p className={`text-[10px] font-semibold mb-1 ${isToday(day) ? "text-brand" : "text-pm-text-tertiary"}`}>
              {dayLabel}
            </p>
            <div className="space-y-1">
              {entries.map(({ time, task }) => (
                <div key={`${day.toDateString()}-${task.id}`} className="group flex items-center gap-2">
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
                    <button
                      onClick={() => onRemove(task.id)}
                      className="text-[10px] text-pm-text-muted hover:text-red-400 cursor-pointer opacity-40 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex-shrink-0"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
