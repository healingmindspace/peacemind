export interface Goal {
  id: string;
  name: string;
  icon: string;
  sort_order: number;
  active: boolean;
  deleted: boolean;
  objective: string | null;
  plan: string | null;
  created_at: string;
}

export interface AiStep {
  title: string;
  description?: string;
  scheduleType: "once" | "habit" | "gentle";
  habitFreq?: string;
  habitTime?: string;
  duration?: number;
  gentle?: string;
}

export interface Task {
  id: string;
  goal_id: string | null;
  title: string;
  description: string | null;
  due_date: string | null;
  completed: boolean;
  completed_at: string | null;
  schedule_type: string;
  schedule_rule: { freq?: string; time?: string; gentle?: string } | null;
  duration: number | null;
  google_event_id: string | null;
  created_at: string;
}

export type SubTab = "goals" | "journal" | "review";

export const PRESET_GOALS = [
  { name: "School", nameZh: "学业", icon: "📚" },
  { name: "Work", nameZh: "工作", icon: "💼" },
  { name: "Life", nameZh: "生活", icon: "🌱" },
  { name: "Exercise", nameZh: "运动", icon: "💪" },
  { name: "Blackbelt", nameZh: "黑带", icon: "🥋" },
];

export interface GrowIntent {
  trigger: string;
  moodLabel?: string;
  moodEmoji?: string;
  helped?: string | null;
  source: "mood-done" | "mood-history" | "journal-history";
}
