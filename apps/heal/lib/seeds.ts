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
 * - Authenticated users: stored in DB (synced across devices/apps)
 * - Anonymous users: stored in localStorage (migrated on account claim)
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
  INVITE_SENT: "invite_sent",
  INVITE_WELCOME: "invite_welcome",
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
  [SEED_ACTIONS.INVITE_SENT]: 50,
  [SEED_ACTIONS.INVITE_WELCOME]: 20,
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
  [SEED_ACTIONS.INVITE_SENT]: { en: "Friend joined via invite", zh: "好友通过邀请加入" },
  [SEED_ACTIONS.INVITE_WELCOME]: { en: "Welcome bonus (invited)", zh: "欢迎奖励（受邀）" },
  [`delete-${SEED_ACTIONS.MOOD}`]: { en: "Deleted mood", zh: "删除心情" },
  [`delete-${SEED_ACTIONS.JOURNAL}`]: { en: "Deleted journal", zh: "删除日记" },
};

// --- History ---

export interface SeedHistoryEntry {
  action: string;
  amount: number;
  date: string;
}

// --- Local storage helpers (for anonymous users / offline fallback) ---

function getLocalSeeds(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(SEEDS_KEY) || "0", 10);
}

function setLocalSeeds(amount: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SEEDS_KEY, String(amount));
}

function getLocalHistory(): SeedHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(SEED_HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

function addLocalHistory(action: string, amount: number) {
  const history = getLocalHistory();
  history.unshift({ action, amount, date: new Date().toISOString() });
  if (history.length > 100) history.length = 100;
  localStorage.setItem(SEED_HISTORY_KEY, JSON.stringify(history));
}

function getLocalLog(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(SEED_LOG_KEY) || "{}");
  } catch {
    return {};
  }
}

function setLocalLog(log: Record<string, string>) {
  localStorage.setItem(SEED_LOG_KEY, JSON.stringify(log));
}

function emitSeedsChanged(balance: number) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("seeds-changed", { detail: balance }));
  }
}

// --- Public API ---

export function getSeeds(): number {
  return getLocalSeeds();
}

export function getSeedHistory(): SeedHistoryEntry[] {
  return getLocalHistory();
}

/**
 * Award seeds for an action. Syncs to server if accessToken provided.
 * Returns the amount awarded (0 if already earned today).
 */
export async function awardSeeds(action: SeedAction, accessToken?: string | null): Promise<number> {
  if (typeof window === "undefined") return 0;

  const amount = SEED_REWARDS[action];

  // Authenticated: server is source of truth
  if (accessToken) {
    try {
      const res = await fetch("/api/seeds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "award", accessToken, seedAction: action, amount }),
      });
      const data = await res.json();
      if (data.awarded === 0) return 0; // already awarded today
      if (data.balance !== undefined) {
        setLocalSeeds(data.balance);
        addLocalHistory(action, amount);
        emitSeedsChanged(data.balance);
      }
      return data.awarded ?? amount;
    } catch {
      // Server unreachable — fall through to localStorage
    }
  }

  // Anonymous or offline: localStorage only
  const today = new Date().toDateString();
  if (!action.startsWith("streak")) {
    const log = getLocalLog();
    const key = `${action}:${today}`;
    if (log[key]) return 0;
    log[key] = today;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    for (const [k, v] of Object.entries(log)) {
      if (new Date(v) < sevenDaysAgo) delete log[k];
    }
    setLocalLog(log);
  }
  const newLocal = Math.max(0, getLocalSeeds() + amount);
  setLocalSeeds(newLocal);
  addLocalHistory(action, amount);
  emitSeedsChanged(newLocal);
  return amount;
}

/**
 * Deduct seeds when user deletes content. Syncs to server if accessToken provided.
 */
export async function deductSeeds(action: "mood" | "journal", accessToken?: string | null): Promise<number> {
  if (typeof window === "undefined") return 0;

  const amount = SEED_REWARDS[action];

  // Authenticated: server is source of truth
  if (accessToken) {
    try {
      const res = await fetch("/api/seeds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deduct", accessToken, seedAction: action, amount }),
      });
      const data = await res.json();
      if (data.balance !== undefined) {
        setLocalSeeds(data.balance);
        addLocalHistory(`delete-${action}`, -amount);
        emitSeedsChanged(data.balance);
      }
      return amount;
    } catch {
      // Server unreachable — fall through to localStorage
    }
  }

  // Anonymous or offline
  const newLocal = Math.max(0, getLocalSeeds() - amount);
  setLocalSeeds(newLocal);
  addLocalHistory(`delete-${action}`, -amount);
  emitSeedsChanged(newLocal);
  return amount;
}

/**
 * Load seeds from server and sync to localStorage.
 * Call this on app load when user is authenticated.
 */
export async function loadSeedsFromServer(accessToken: string): Promise<{ balance: number; history: SeedHistoryEntry[] }> {
  try {
    const res = await fetch("/api/seeds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get", accessToken }),
    });
    const data = await res.json();
    const balance = data.balance ?? 0;
    const history = (data.history ?? []).map((h: { action: string; amount: number; created_at: string }) => ({
      action: h.action,
      amount: h.amount,
      date: h.created_at,
    }));

    setLocalSeeds(balance);
    if (history.length > 0) {
      localStorage.setItem(SEED_HISTORY_KEY, JSON.stringify(history));
    }
    emitSeedsChanged(balance);

    return { balance, history };
  } catch {
    return { balance: getLocalSeeds(), history: getLocalHistory() };
  }
}

/**
 * Migrate localStorage seeds to DB on first login.
 * Call once when user transitions from anonymous to authenticated.
 */
export async function syncLocalSeedsToServer(accessToken: string): Promise<void> {
  const localBalance = getLocalSeeds();
  const localHistory = getLocalHistory();

  if (localBalance === 0 && localHistory.length === 0) return;

  try {
    await fetch("/api/seeds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "sync",
        accessToken,
        localBalance,
        localHistory,
      }),
    });
  } catch {
    // Sync failed — will try again next time
  }
}
