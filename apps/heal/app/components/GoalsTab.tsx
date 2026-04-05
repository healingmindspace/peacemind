"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import GratitudeJournal from "./GratitudeJournal";
import WeekCalendar from "./WeekCalendar";
import type { Goal, Task, AiStep, GrowIntent, SubTab } from "./goals/types";
import { PRESET_GOALS } from "./goals/types";
import TaskItem from "./goals/TaskItem";
import AddTaskForm from "./goals/AddTaskForm";
import AIPlanPanel from "./goals/AIPlanPanel";
import GrowIntentPicker from "./goals/GrowIntentPicker";
import WeeklyReview from "./goals/WeeklyReview";
import SeedsDisplay from "./SeedsDisplay";

export type { Goal, Task, AiStep, GrowIntent };

export default function GoalsTab({ growIntent, onClearGrowIntent }: { growIntent?: GrowIntent | null; onClearGrowIntent?: () => void }) {
  const [subTab, setSubTab] = useState<SubTab>("journal");
  const { user, accessToken } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newGoalName, setNewGoalName] = useState("");
  const [newGoalIcon, setNewGoalIcon] = useState("🌿");
  const [showAddTask, setShowAddTask] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskDate, setNewTaskDate] = useState("");
  const [newTaskTime, setNewTaskTime] = useState("");
  const [newScheduleType, setNewScheduleType] = useState<"once" | "habit" | "gentle">("once");
  const [newHabitFreq, setNewHabitFreq] = useState("daily");
  const [newHabitTime, setNewHabitTime] = useState("09:00");
  const [newDuration, setNewDuration] = useState("");
  const [newGentle, setNewGentle] = useState("thisWeek");
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editDue, setEditDue] = useState("");
  const [saving, setSaving] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [objectiveGoalId, setObjectiveGoalId] = useState<string | null>(null);
  const [objectiveText, setObjectiveText] = useState("");
  const [aiPlan, setAiPlan] = useState<{ message: string; steps: AiStep[] } | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [schedulingTaskId, setSchedulingTaskId] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [selectedPresets, setSelectedPresets] = useState<Set<string>>(new Set(PRESET_GOALS.map((p) => p.name)));
  const { t, lang } = useI18n();

  // Smart detect schedule from step title
  // Format date as YYYY-MM-DD in local timezone (avoids UTC shift from toISOString)
  const toLocalDateStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const detectSchedule = (title: string) => {
    const lower = title.toLowerCase();

    if (/\b(every\s*day|everyday|daily|每天|每日)\b/.test(lower)) {
      setNewScheduleType("habit"); setNewHabitFreq("daily");
    } else if (/\b(weekdays?|工作日)\b/.test(lower)) {
      setNewScheduleType("habit"); setNewHabitFreq("weekdays");
    } else if (/\b(every\s*week|weekly|每周)\b/.test(lower)) {
      setNewScheduleType("habit"); setNewHabitFreq("weekly");
    }

    const dayPatterns: [RegExp, number][] = [
      [/\b(sunday|sun)\b/, 0], [/\b(monday|mon)\b/, 1], [/\b(tuesday|tue|tues)\b/, 2],
      [/\b(wednesday|wed)\b/, 3], [/\b(thursday|thu|thur|thurs)\b/, 4],
      [/\b(friday|fri)\b/, 5], [/\b(saturday|sat)\b/, 6],
      [/周日/, 0], [/周一/, 1], [/周二/, 2], [/周三/, 3], [/周四/, 4], [/周五/, 5], [/周六/, 6],
      [/星期日/, 0], [/星期一/, 1], [/星期二/, 2], [/星期三/, 3], [/星期四/, 4], [/星期五/, 5], [/星期六/, 6],
    ];
    for (const [pattern, dayNum] of dayPatterns) {
      if (pattern.test(lower)) {
        setNewScheduleType("once");
        const now = new Date();
        const diff = (dayNum - now.getDay() + 7) % 7 || 7;
        const target = new Date(now);
        target.setDate(now.getDate() + diff);
        setNewTaskDate(toLocalDateStr(target));
        break;
      }
    }

    if (/\b(today|今天)\b/.test(lower)) {
      setNewScheduleType("once");
      setNewTaskDate(toLocalDateStr(new Date()));

    } else if (/\b(tomorrow|明天)\b/.test(lower)) {
      setNewScheduleType("once");
      const tom = new Date(); tom.setDate(tom.getDate() + 1);
      setNewTaskDate(toLocalDateStr(tom));

    }

    // Explicit date formats: "4/1", "4/1/2026", "April 1", "Apr 1", "Apr 1 2026"
    const monthNames: Record<string, number> = {
      jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
      apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6,
      aug: 7, august: 7, sep: 8, september: 8, oct: 9, october: 9,
      nov: 10, november: 10, dec: 11, december: 11,
    };
    // MM/DD or MM/DD/YYYY
    const slashDate = lower.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\b/);
    // "April 1" or "Apr 1 2026"
    const namedDate = lower.match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:\s*,?\s*(\d{4}))?\b/);

    if (slashDate) {
      const m = parseInt(slashDate[1]) - 1;
      const d = parseInt(slashDate[2]);
      const y = slashDate[3] ? parseInt(slashDate[3]) : new Date().getFullYear();
      const date = new Date(y, m, d);
      if (!isNaN(date.getTime()) && date.getMonth() === m) {
        setNewScheduleType("once");
        setNewTaskDate(`${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  
      }
    } else if (namedDate) {
      const m = monthNames[namedDate[1]];
      const d = parseInt(namedDate[2]);
      const y = namedDate[3] ? parseInt(namedDate[3]) : new Date().getFullYear();
      const date = new Date(y, m, d);
      if (!isNaN(date.getTime()) && date.getMonth() === m) {
        setNewScheduleType("once");
        setNewTaskDate(`${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  
      }
    }

    let bestTime: string | null = null;
    const p1 = lower.match(/\b(\d{1,2}):(\d{2})\s*(am|pm)\b/);
    if (p1) {
      let h = parseInt(p1[1]); const m = parseInt(p1[2]);
      if (p1[3] === "pm" && h < 12) h += 12;
      if (p1[3] === "am" && h === 12) h = 0;
      bestTime = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
    if (!bestTime) {
      const p2 = lower.match(/\b(\d{1,2})\s*(am|pm)\b/);
      if (p2) {
        let h = parseInt(p2[1]);
        if (p2[2] === "pm" && h < 12) h += 12;
        if (p2[2] === "am" && h === 12) h = 0;
        bestTime = `${String(h).padStart(2, "0")}:00`;
      }
    }
    if (!bestTime) {
      const p3 = lower.match(/(?:at\s+)?(\d{1,2}):(\d{2})(?:\s*(?:in the\s*)?)(morning|afternoon|evening|早上|上午|下午|晚上)?/);
      if (p3) {
        let h = parseInt(p3[1]); const m = parseInt(p3[2]);
        const ctx = p3[3];
        if (ctx === "afternoon" || ctx === "evening" || ctx === "下午" || ctx === "晚上") { if (h < 12) h += 12; }
        if (ctx === "morning" || ctx === "早上" || ctx === "上午") { if (h === 12) h = 0; }
        if (!ctx) {
          if (/\b(afternoon|evening|下午|晚上)\b/.test(lower) && h < 12) h += 12;
        }
        bestTime = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      }
    }
    if (bestTime) { setNewTaskTime(bestTime); setNewHabitTime(bestTime); }

    const durMatch = lower.match(/(\d+)\s*min/);
    if (durMatch) setNewDuration(durMatch[1]);
  };

  useEffect(() => {
    if (user && accessToken) { loadGoals(user.id); loadTasks(user.id); }
    else { setGoals([]); setTasks([]); }
  }, [user, accessToken]);

  const loadGoals = async (userId: string) => {
    if (!accessToken) return;
    const res = await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "list", userId, accessToken }),
    });
    const json = await res.json();
    if (json.data) {
      if (json.data.length === 0) {
        for (const preset of PRESET_GOALS) {
          await fetch("/api/goals", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "insert", userId, accessToken, name: lang === "zh" ? preset.nameZh : preset.name, icon: preset.icon }),
          });
        }
        const res2 = await fetch("/api/goals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "list", userId, accessToken }),
        });
        const json2 = await res2.json();
        if (json2.data) setGoals(json2.data);
      } else {
        setGoals(json.data);
      }
    }
  };

  const loadTasks = async (userId: string, goalId?: string) => {
    if (!accessToken) return;
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "list", userId, accessToken, goalId }),
    });
    const json = await res.json();
    if (json.data) setTasks(json.data);
  };

  const addGoal = async (name: string, icon: string) => {
    if (!user || !name.trim()) return;
    setSaving(true);
    if (!accessToken) { setSaving(false); return; }
    await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "insert", userId: user.id, accessToken, name: name.trim(), icon }),
    });
    setNewGoalName(""); setNewGoalIcon("🌿"); setShowAddGoal(false); setShowPresets(false);
    await loadGoals(user.id);
    setSaving(false);
  };

  const achieveGoal = async (id: string) => {
    if (!user) return;
    if (!accessToken) return;
    await fetch("/api/goals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update", userId: user.id, accessToken, id, active: false, plan: "achieved" }) });
    await loadGoals(user.id);
  };

  const deleteGoal = async (id: string) => {
    if (!user) return;
    if (!accessToken) return;
    await fetch("/api/goals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", userId: user.id, accessToken, id }) });
    await loadGoals(user.id);
  };

  const restoreGoal = async (id: string) => {
    if (!user) return;
    if (!accessToken) return;
    await fetch("/api/goals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update", userId: user.id, accessToken, id, active: true, deleted: false }) });
    await loadGoals(user.id);
  };

  const toggleGoalActive = async (id: string, active: boolean) => {
    if (!user) return;
    if (!accessToken) return;
    await fetch("/api/goals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update", userId: user.id, accessToken, id, active }) });
    await loadGoals(user.id);
  };

  const addTask = async (goalId: string) => {
    if (!user || !newTaskTitle.trim()) return;
    setSaving(true);
    if (!accessToken) { setSaving(false); return; }
    const tzOffset = new Date().getTimezoneOffset();
    const tzSign = tzOffset <= 0 ? "+" : "-";
    const tzH = String(Math.floor(Math.abs(tzOffset) / 60)).padStart(2, "0");
    const tzM = String(Math.abs(tzOffset) % 60).padStart(2, "0");
    const tz = `${tzSign}${tzH}:${tzM}`;
    const dueDate = newTaskDate ? (newTaskTime ? `${newTaskDate}T${newTaskTime}:00${tz}` : `${newTaskDate}T12:00:00${tz}`) : null;
    const dur = newDuration ? parseInt(newDuration) : null;
    const taskTitle = newTaskTitle.trim();
    const taskDesc = newTaskDesc.trim() || null;

    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "insert", userId: user.id, accessToken, goalId,
        title: taskTitle, description: taskDesc, dueDate,
        scheduleType: newScheduleType,
        scheduleRule: newScheduleType === "habit" ? { freq: newHabitFreq, time: newHabitTime } : newScheduleType === "gentle" ? { gentle: newGentle } : null,
        duration: dur,
      }),
    });
    setNewTaskTitle(""); setNewTaskDesc(""); setNewTaskDate(""); setNewTaskTime("");
    setNewScheduleType("once"); setNewHabitFreq("daily"); setNewHabitTime("09:00");
    setNewDuration(""); setNewGentle("thisWeek"); setShowAddTask(null);
    await loadTasks(user.id);
    setSaving(false);
  };

  const toggleTask = async (taskId: string, completed: boolean) => {
    if (!user) return;
    if (!accessToken) return;
    await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "toggle_complete", userId: user.id, accessToken, id: taskId, completed }) });
    await loadTasks(user.id);
  };

  const updateTask = async (taskId: string) => {
    if (!user || !editTitle.trim()) return;
    setSaving(true);
    if (!accessToken) { setSaving(false); return; }
    await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update", userId: user.id, accessToken, id: taskId, title: editTitle.trim(), description: editDesc.trim() || null, dueDate: editDue || null }) });
    setEditingTask(null);
    await loadTasks(user.id);
    setSaving(false);
  };

  const scheduleTask = async (taskId: string, date: string, time: string) => {
    if (!user) return;
    if (!accessToken) return;
    const tzOffset = new Date().getTimezoneOffset();
    const tzSign = tzOffset <= 0 ? "+" : "-";
    const tzH = String(Math.floor(Math.abs(tzOffset) / 60)).padStart(2, "0");
    const tzM = String(Math.abs(tzOffset) % 60).padStart(2, "0");
    const tz = `${tzSign}${tzH}:${tzM}`;
    const dueDate = time ? `${date}T${time}:00${tz}` : `${date}T12:00:00${tz}`;
    await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update", userId: user.id, accessToken, id: taskId, dueDate }) });
    setSchedulingTaskId(null); setScheduleDate(""); setScheduleTime("");
    await loadTasks(user.id);
  };

  const unscheduleTask = async (taskId: string) => {
    if (!user) return;
    if (!accessToken) return;
    await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update", userId: user.id, accessToken, id: taskId, dueDate: null }) });
    await loadTasks(user.id);
  };

  const deleteTask = async (taskId: string) => {
    if (!user) return;
    if (!accessToken) return;
    await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", userId: user.id, accessToken, id: taskId }) });
    await loadTasks(user.id);
  };

  const startEdit = (task: Task) => {
    setEditingTask(task.id);
    setEditTitle(task.title);
    setEditDesc(task.description || "");
    setEditDue(task.due_date ? task.due_date.slice(0, 16) : "");
  };

  const formatSchedule = (task: Task) => {
    const parts: string[] = [];
    if (task.schedule_type === "habit" && task.schedule_rule) {
      const freq = task.schedule_rule.freq;
      parts.push(freq === "daily" ? t("tasks.daily") : freq === "weekdays" ? t("tasks.weekdays") : t("tasks.weekly"));
      if (task.schedule_rule.time) parts.push(`${t("tasks.atTime")} ${task.schedule_rule.time}`);
    } else if (task.schedule_type === "gentle" && task.schedule_rule?.gentle) {
      parts.push(t(`tasks.${task.schedule_rule.gentle}`));
    }
    if (task.duration) parts.push(`${task.duration}${t("tasks.min")}`);
    return parts.join(" · ");
  };

  const generatePlan = async (goalId: string) => {
    const goal = goals.find((g) => g.id === goalId);
    if (!goal || !objectiveText.trim()) return;
    setPlanLoading(true); setAiPlan(null);
    if (accessToken && user) {
      await fetch("/api/goals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update", userId: user.id, accessToken, id: goalId, objective: objectiveText.trim() }) });
    }
    try {
      const res = await fetch("/api/plan-path", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pathName: goal.name, objective: objectiveText.trim(), lang }) });
      const data = await res.json();
      if (data.steps) {
        setAiPlan(data);
      } else {
        setAiPlan({ message: data.error || t("goals.planRetry"), steps: [] });
      }
    } catch {
      setAiPlan({ message: t("goals.planRetry"), steps: [] });
    }
    setPlanLoading(false);
  };

  const acceptPlan = async (goalId: string) => {
    if (!user || !aiPlan) return;
    setSaving(true);
    if (!accessToken) { setSaving(false); return; }
    await fetch("/api/goals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update", userId: user.id, accessToken, id: goalId, plan: JSON.stringify(aiPlan) }) });
    for (const step of aiPlan.steps) {
      await fetch("/api/tasks", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "insert", userId: user.id, accessToken, goalId,
          title: step.title, description: step.description || null, scheduleType: step.scheduleType,
          scheduleRule: step.scheduleType === "habit" ? { freq: step.habitFreq || "daily", time: step.habitTime || "09:00" } : step.scheduleType === "gentle" ? { gentle: step.gentle || "soon" } : null,
          duration: step.duration || null,
        }),
      });
    }
    setAiPlan(null); setObjectiveGoalId(null); setObjectiveText("");
    await loadTasks(user.id);
    setSaving(false);
  };

  // Grow intent from Mood/Journal
  const [growPickerText, setGrowPickerText] = useState<string | null>(null);
  const [newPathForGrow, setNewPathForGrow] = useState("");

  useEffect(() => {
    if (!growIntent || goals.length === 0) return;
    setSubTab("goals"); setGrowPickerText(growIntent.trigger); onClearGrowIntent?.();
  }, [growIntent, goals.length]);

  const selectPathForGrow = (goalId: string) => {
    if (!growPickerText) return;
    setExpandedGoal(goalId); setObjectiveGoalId(goalId); setObjectiveText(growPickerText);
    setGrowPickerText(null); setNewPathForGrow("");
  };

  const createPathForGrow = async () => {
    if (!user || !newPathForGrow.trim() || !growPickerText) return;
    setSaving(true);
    if (!accessToken) { setSaving(false); return; }
    const res = await fetch("/api/goals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "insert", userId: user.id, accessToken, name: newPathForGrow.trim(), icon: "🌿" }) });
    const data = await res.json();
    await loadGoals(user.id);
    if (data.id) { setExpandedGoal(data.id); setObjectiveGoalId(data.id); setObjectiveText(growPickerText); }
    setGrowPickerText(null); setNewPathForGrow(""); setSaving(false);
  };

  const activeGoals = goals.filter((g) => g.active !== false && !g.deleted);
  const achievedGoals = goals.filter((g) => g.active === false && !g.deleted && g.plan === "achieved");
  const hiddenGoals = goals.filter((g) => g.active === false && !g.deleted && g.plan !== "achieved");
  const archivedGoals = goals.filter((g) => g.deleted);

  const now = new Date();
  const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);
  const overdueTasks = tasks.filter((t) => !t.completed && t.due_date && new Date(t.due_date) < now);
  const todayTasks = tasks.filter((t) => !t.completed && t.due_date && new Date(t.due_date) >= now && new Date(t.due_date) <= todayEnd);
  const reminderCount = overdueTasks.length + todayTasks.length;

  const getTasksForGoal = (goalId: string) => tasks.filter((t) => t.goal_id === goalId);

  const formatDue = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const text = d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    return { text, isOverdue: d < now };
  };

  const addPresetGoals = async () => {
    if (!user) return;
    setSaving(true);
    if (!accessToken) { setSaving(false); return; }
    for (const preset of PRESET_GOALS.filter((p) => selectedPresets.has(p.name))) {
      await fetch("/api/goals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "insert", userId: user.id, accessToken, name: lang === "zh" ? preset.nameZh : preset.name, icon: preset.icon }) });
    }
    setShowPresets(false); await loadGoals(user.id); setSaving(false);
  };

  const subTabs: { id: SubTab; label: string }[] = [
    { id: "journal", label: t("goals.journal") },
    { id: "goals", label: t("goals.goals") },
    { id: "review", label: t("goals.review") },
  ];

  const resetAddTaskForm = () => {
    setShowAddTask(null); setNewTaskTitle(""); setNewTaskDesc(""); setNewTaskDate(""); setNewTaskTime("");
    setNewScheduleType("once"); setNewDuration("");
  };

  return (
    <section className="py-6 px-4">
      <SeedsDisplay />
      {/* Reminder banner */}
      {reminderCount > 0 && (
        <div className="max-w-sm md:max-w-lg mx-auto mb-4 bg-pm-accent-light/70 rounded-2xl p-3">
          {overdueTasks.length > 0 && (
            <div className="space-y-1">
              {overdueTasks.map((task) => {
                const goal = goals.find((g) => g.id === task.goal_id);
                return (
                  <div key={task.id} className="flex items-center gap-2">
                    <span className="text-xs">⏰</span>
                    <p className="flex-1 text-xs text-red-500 font-medium truncate">{goal ? `${goal.icon} ` : ""}{task.title}</p>
                    <span className="text-[10px] text-red-400">{t("goals.overdue")}</span>
                  </div>
                );
              })}
            </div>
          )}
          {todayTasks.length > 0 && (
            <div className={`space-y-1 ${overdueTasks.length > 0 ? "mt-2" : ""}`}>
              {todayTasks.map((task) => {
                const goal = goals.find((g) => g.id === task.goal_id);
                const timeStr = new Date(task.due_date!).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
                return (
                  <div key={task.id} className="flex items-center gap-2">
                    <span className="text-xs">🌱</span>
                    <p className="flex-1 text-xs text-pm-text-secondary font-medium truncate">{goal ? `${goal.icon} ` : ""}{task.title}</p>
                    <span className="text-[10px] text-pm-text-tertiary">{timeStr}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Sub-tab nav */}
      <div className="flex justify-center gap-2 mb-6">
        {subTabs.map((tab) => (
          <button key={tab.id} onClick={() => setSubTab(tab.id)} className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${subTab === tab.id ? "bg-brand text-white" : "bg-pm-surface-active text-pm-text-secondary hover:bg-pm-surface-hover"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Goals sub-tab */}
      {subTab === "goals" && (
        <div className="max-w-sm md:max-w-lg mx-auto">
          <h2 className="text-xl font-semibold text-pm-text mb-1 text-center">{t("goals.title")}</h2>
          <p className="text-sm text-pm-text-secondary mb-3 text-center">{t("goals.subtitle")}</p>

          {/* Weekly calendar view */}
          {user && (
            <div className="mb-4">
              <button onClick={() => setShowCalendar(!showCalendar)} className="w-full text-xs text-brand hover:text-pm-text-secondary cursor-pointer text-center">
                📅 {showCalendar ? t("goals.hideCalendar") : t("goals.showCalendar")}
              </button>
              {showCalendar && (
                <div className="mt-3">
                  <WeekCalendar tasks={tasks.map((task) => ({ ...task, goal_icon: goals.find((g) => g.id === task.goal_id)?.icon }))} onRemove={(taskId) => unscheduleTask(taskId)} />
                </div>
              )}
            </div>
          )}

          {/* Grow picker */}
          {growPickerText && user && (
            <GrowIntentPicker
              text={growPickerText}
              activeGoals={activeGoals}
              newPathName={newPathForGrow}
              saving={saving}
              onSelectPath={selectPathForGrow}
              onNewPathChange={setNewPathForGrow}
              onCreatePath={createPathForGrow}
              onCancel={() => { setGrowPickerText(null); setNewPathForGrow(""); }}
            />
          )}

          {!user && <p className="text-sm text-pm-text-muted text-center">{t("goals.signIn")}</p>}

          {user && (
            <>
              {/* Goal list */}
              <div className="space-y-3">
                {activeGoals.map((goal) => {
                  const isExpanded = expandedGoal === goal.id;
                  const goalTasks = getTasksForGoal(goal.id);

                  return (
                    <div key={goal.id} className="bg-pm-surface rounded-2xl overflow-hidden">
                      <button onClick={() => setExpandedGoal(isExpanded ? null : goal.id)} className="w-full flex items-center gap-3 p-4 text-left cursor-pointer hover:bg-pm-surface transition-all">
                        <span className="text-2xl">{goal.icon}</span>
                        <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-pm-text">{goal.name}</p></div>
                        <span className="text-pm-text-muted text-sm">{isExpanded ? "▲" : "▼"}</span>
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-pm-accent/50">
                          {goalTasks.length === 0 && <p className="text-xs text-pm-text-muted py-3 text-center">{t("goals.noTasks")}</p>}

                          <div className="space-y-2 mt-2">
                            {goalTasks.map((task) => (
                              <TaskItem
                                key={task.id}
                                task={task}
                                isEditing={editingTask === task.id}
                                editTitle={editTitle}
                                editDesc={editDesc}
                                editDue={editDue}
                                saving={saving}
                                onEditTitleChange={setEditTitle}
                                onEditDescChange={setEditDesc}
                                onToggle={() => toggleTask(task.id, !task.completed)}
                                onSave={() => updateTask(task.id)}
                                onStartEdit={() => startEdit(task)}
                                onCancelEdit={() => setEditingTask(null)}
                                onDelete={() => deleteTask(task.id)}
                                isScheduling={schedulingTaskId === task.id}
                                scheduleDate={scheduleDate}
                                scheduleTime={scheduleTime}
                                onScheduleDateChange={setScheduleDate}
                                onScheduleTimeChange={setScheduleTime}
                                onStartSchedule={() => {
                                  if (task.due_date) {
                                    const d = new Date(task.due_date);
                                    setScheduleDate(toLocalDateStr(d));
                                    setScheduleTime(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
                                  } else {
                                    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
                                    setScheduleDate(toLocalDateStr(tomorrow));
                                    setScheduleTime("09:00");
                                  }
                                  setSchedulingTaskId(task.id);
                                }}
                                onConfirmSchedule={() => scheduleTask(task.id, scheduleDate, scheduleTime)}
                                onCancelSchedule={() => { setSchedulingTaskId(null); setScheduleDate(""); setScheduleTime(""); }}
                                onUnschedule={() => unscheduleTask(task.id)}
                                formatDue={formatDue}
                                formatSchedule={formatSchedule}
                              />
                            ))}
                          </div>

                          {/* Add task / AI plan / action buttons */}
                          {showAddTask === goal.id ? (
                            <AddTaskForm
                              newTaskTitle={newTaskTitle}
                              newTaskDesc={newTaskDesc}
                              newTaskDate={newTaskDate}
                              newTaskTime={newTaskTime}
                              newScheduleType={newScheduleType}
                              newHabitFreq={newHabitFreq}
                              newDuration={newDuration}
                              saving={saving}
                              onTitleChange={setNewTaskTitle}
                              onDescChange={setNewTaskDesc}
                              onTitleBlur={detectSchedule}
                              onSave={() => addTask(goal.id)}
                              onCancel={resetAddTaskForm}
                            />
                          ) : objectiveGoalId === goal.id ? (
                            <AIPlanPanel
                              objectiveText={objectiveText}
                              aiPlan={aiPlan}
                              planLoading={planLoading}
                              saving={saving}
                              onObjectiveChange={setObjectiveText}
                              onGenerate={() => generatePlan(goal.id)}
                              onAccept={() => acceptPlan(goal.id)}
                              onRetry={() => setAiPlan(null)}
                              onCancel={() => { setObjectiveGoalId(null); setObjectiveText(""); setAiPlan(null); }}
                            />
                          ) : (
                            <div className="mt-3 flex justify-between items-center">
                              <div className="flex gap-3">
                                <button onClick={() => setShowAddTask(goal.id)} className="text-xs text-brand hover:text-pm-text-secondary cursor-pointer">+ {t("goals.addTask")}</button>
                                <button onClick={() => { setObjectiveGoalId(goal.id); setObjectiveText(goal.objective || ""); }} className="text-xs text-pm-text-muted hover:text-brand cursor-pointer">✨ {t("goals.aiPlan")}</button>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => achieveGoal(goal.id)} className="text-[10px] text-[#8a9e6a] hover:text-[#6a8a4a] cursor-pointer">🎉 {lang === "zh" ? "达成" : "Achieve"}</button>
                                <button onClick={() => toggleGoalActive(goal.id, false)} className="text-[10px] text-pm-text-muted hover:text-brand cursor-pointer">{t("goals.hidePath")}</button>
                                <button onClick={() => deleteGoal(goal.id)} className="text-[10px] text-pm-text-muted hover:text-red-400 cursor-pointer">{lang === "zh" ? "归档" : "Archive"}</button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add goal */}
              {showAddGoal ? (
                <div className="mt-4 bg-pm-surface rounded-2xl p-4 space-y-3">
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {["🌿", "🌸", "🌊", "🌻", "🍃", "🌙", "☀️", "🦋", "🐚", "✨", "🕊️", "💫"].map((icon) => (
                      <button key={icon} onClick={() => setNewGoalIcon(icon)} className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center cursor-pointer transition-all ${newGoalIcon === icon ? "bg-brand shadow-md scale-110" : "bg-pm-surface-active hover:bg-pm-surface-hover"}`}>
                        {icon}
                      </button>
                    ))}
                  </div>
                  <input type="text" value={newGoalName} onChange={(e) => setNewGoalName(e.target.value)} placeholder={t("goals.goalName")} className="w-full px-3 py-1.5 rounded-xl bg-pm-surface-active border border-pm-border text-pm-text text-xs focus:outline-none focus:ring-2 focus:ring-brand-light" autoFocus />
                  <div className="flex gap-2">
                    <button onClick={() => addGoal(newGoalName, newGoalIcon)} disabled={saving || !newGoalName.trim()} className="px-4 py-1.5 rounded-full text-xs bg-brand text-white cursor-pointer disabled:opacity-40">{t("tasks.save")}</button>
                    <button onClick={() => { setShowAddGoal(false); setNewGoalName(""); setNewGoalIcon("🌿"); }} className="px-4 py-1.5 rounded-full text-xs bg-pm-surface-active text-pm-text-secondary cursor-pointer">{t("tasks.cancel")}</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowAddGoal(true)} className="mt-4 w-full py-3 rounded-2xl border-2 border-dashed border-pm-border text-sm text-brand hover:bg-pm-surface cursor-pointer transition-all">+ {t("goals.addGoal")}</button>
              )}

              {/* Achieved paths */}
              {achievedGoals.length > 0 && (
                <div className="mt-4">
                  <details className="text-xs">
                    <summary className="text-[#8a9e6a] hover:text-[#6a8a4a] cursor-pointer font-medium">
                      🎉 {lang === "zh" ? `已达成（${achievedGoals.length}）` : `Achieved (${achievedGoals.length})`}
                    </summary>
                    <div className="mt-2 space-y-2">
                      {achievedGoals.map((goal) => (
                        <div key={goal.id} className="flex items-center gap-3 bg-[#f0f6e6]/50 rounded-xl px-4 py-2">
                          <span className="text-lg">{goal.icon}</span>
                          <p className="flex-1 text-sm text-[#5a7a4a] font-medium">{goal.name}</p>
                          <button onClick={() => restoreGoal(goal.id)} className="text-xs text-[#8a9e6a] hover:text-[#5a7a4a] cursor-pointer">{lang === "zh" ? "恢复" : "Restore"}</button>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              )}

              {/* Hidden paths */}
              {hiddenGoals.length > 0 && (
                <div className="mt-2">
                  <details className="text-xs">
                    <summary className="text-pm-text-muted hover:text-brand cursor-pointer">
                      {t("goals.showHidden", { count: hiddenGoals.length })}
                    </summary>
                    <div className="mt-2 space-y-2">
                      {hiddenGoals.map((goal) => (
                        <div key={goal.id} className="flex items-center gap-3 bg-pm-surface rounded-xl px-4 py-2 opacity-60">
                          <span className="text-lg">{goal.icon}</span>
                          <p className="flex-1 text-sm text-pm-text-secondary">{goal.name}</p>
                          <button onClick={() => toggleGoalActive(goal.id, true)} className="text-xs text-brand hover:text-pm-text-secondary cursor-pointer">{t("goals.activate")}</button>
                          <button onClick={() => deleteGoal(goal.id)} className="text-xs text-pm-text-muted hover:text-red-400 cursor-pointer">{lang === "zh" ? "归档" : "Archive"}</button>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              )}

              {/* Archived paths */}
              {archivedGoals.length > 0 && (
                <div className="mt-2">
                  <details className="text-xs">
                    <summary className="text-pm-text-muted hover:text-brand cursor-pointer">
                      {lang === "zh" ? `归档（${archivedGoals.length}）` : `Archived (${archivedGoals.length})`}
                    </summary>
                    <div className="mt-2 space-y-2">
                      {archivedGoals.map((goal) => (
                        <div key={goal.id} className="flex items-center gap-3 bg-pm-surface rounded-xl px-4 py-2 opacity-40">
                          <span className="text-lg">{goal.icon}</span>
                          <p className="flex-1 text-sm text-pm-text-secondary line-through">{goal.name}</p>
                          <button onClick={() => restoreGoal(goal.id)} className="text-xs text-brand hover:text-pm-text-secondary cursor-pointer">{lang === "zh" ? "恢复" : "Restore"}</button>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Journal sub-tab */}
      {subTab === "journal" && <GratitudeJournal goals={goals} onNavigateToGrow={(intent) => { setSubTab("goals"); setGrowPickerText(intent.trigger); }} />}

      {/* Review sub-tab */}
      {subTab === "review" && user && <WeeklyReview user={user} />}
    </section>
  );
}
