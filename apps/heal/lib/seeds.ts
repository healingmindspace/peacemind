/**
 * Seeds reward system — earn seeds by showing up.
 *
 * DESIGN PRINCIPLE:
 * - Seeds are earned by taking positive actions (logging mood, writing journal, breathing, etc.)
 * - Seeds are deducted when content is deleted (discourages gaming the system)
 * - Each action can only earn seeds once per day (prevents spam logging)
 * - Streak milestones are one-time bonuses
 * - Seeds can never go below 0
 * - All seed changes are logged with history for user transparency
 * - Stored in localStorage now. Cross-platform sync via DB in the future.
 */

const SEEDS_KEY = "pm-seeds";
const SEED_LOG_KEY = "pm-seed-log";
const SEED_HISTORY_KEY = "pm-seed-history";

// --- Action constants ---

export const SEED_ACTIONS = {
  MOOD: "mood",
  JOURNAL: "journal",
  BREATHING: "breathing",
  ASSESSMENT: "assessment",
  GROUNDING: "grounding",
  STREAK_7: "streak7",
  STREAK_30: "streak30",
  STREAK_100: "streak100",
} as const;

export type SeedAction = (typeof SEED_ACTIONS)[keyof typeof SEED_ACTIONS];

// --- Reward amounts ---

export const SEED_REWARDS: Record<SeedAction, number> = {
  [SEED_ACTIONS.MOOD]: 5,
  [SEED_ACTIONS.JOURNAL]: 5,
  [SEED_ACTIONS.BREATHING]: 3,
  [SEED_ACTIONS.ASSESSMENT]: 5,
  [SEED_ACTIONS.GROUNDING]: 3,
  [SEED_ACTIONS.STREAK_7]: 20,
  [SEED_ACTIONS.STREAK_30]: 100,
  [SEED_ACTIONS.STREAK_100]: 500,
};

// --- Action labels for history display ---

export const SEED_LABELS: Record<string, { en: string; zh: string }> = {
  [SEED_ACTIONS.MOOD]: { en: "Logged mood", zh: "记录心情" },
  [SEED_ACTIONS.JOURNAL]: { en: "Wrote journal", zh: "写日记" },
  [SEED_ACTIONS.BREATHING]: { en: "Breathing exercise", zh: "呼吸练习" },
  [SEED_ACTIONS.ASSESSMENT]: { en: "Self assessment", zh: "自我评估" },
  [SEED_ACTIONS.GROUNDING]: { en: "Grounding exercise", zh: "接地练习" },
  [SEED_ACTIONS.STREAK_7]: { en: "7-day streak bonus", zh: "7天连续奖励" },
  [SEED_ACTIONS.STREAK_30]: { en: "30-day streak bonus", zh: "30天连续奖励" },
  [SEED_ACTIONS.STREAK_100]: { en: "100-day streak bonus", zh: "100天连续奖励" },
  [`delete-${SEED_ACTIONS.MOOD}`]: { en: "Deleted mood", zh: "删除心情" },
  [`delete-${SEED_ACTIONS.JOURNAL}`]: { en: "Deleted journal", zh: "删除日记" },
};

// --- History ---

export interface SeedHistoryEntry {
  action: string;
  amount: number;
  date: string;
}

export function getSeedHistory(): SeedHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(SEED_HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

function logSeedHistory(action: string, amount: number) {
  const history = getSeedHistory();
  history.unshift({ action, amount, date: new Date().toISOString() });
  // Keep last 100 entries
  if (history.length > 100) history.length = 100;
  localStorage.setItem(SEED_HISTORY_KEY, JSON.stringify(history));
}

// --- Core functions ---

export function getSeeds(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(SEEDS_KEY) || "0", 10);
}

export function addSeeds(amount: number): number {
  const current = getSeeds();
  const next = Math.max(0, current + amount); // never go below 0
  localStorage.setItem(SEEDS_KEY, String(next));
  window.dispatchEvent(new CustomEvent("seeds-changed", { detail: next }));
  return next;
}

/**
 * Award seeds for an action, but only once per action per day.
 * Returns the amount awarded (0 if already earned today).
 */
export function awardSeeds(action: SeedAction): number {
  if (typeof window === "undefined") return 0;

  const today = new Date().toDateString();
  const logRaw = localStorage.getItem(SEED_LOG_KEY);
  const log: Record<string, string> = logRaw ? JSON.parse(logRaw) : {};

  // For streaks, always award (they're milestones, not daily)
  if (action.startsWith("streak")) {
    const amount = SEED_REWARDS[action];
    addSeeds(amount);
    logSeedHistory(action, amount);
    return amount;
  }

  // For daily actions, award once per action per day
  const key = `${action}:${today}`;
  if (log[key]) return 0;

  const amount = SEED_REWARDS[action];
  addSeeds(amount);
  logSeedHistory(action, amount);
  log[key] = today;

  // Clean old entries (keep last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  for (const [k, v] of Object.entries(log)) {
    if (new Date(v) < sevenDaysAgo) delete log[k];
  }
  localStorage.setItem(SEED_LOG_KEY, JSON.stringify(log));

  return amount;
}

/**
 * Deduct seeds when user deletes content.
 * Seeds can't go below 0.
 */
export function deductSeeds(action: "mood" | "journal"): number {
  if (typeof window === "undefined") return 0;
  const amount = SEED_REWARDS[action];
  addSeeds(-amount);
  logSeedHistory(`delete-${action}`, -amount);
  return amount;
}
