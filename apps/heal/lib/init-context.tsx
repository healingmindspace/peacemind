"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";

interface SeedHistoryEntry {
  action: string;
  amount: number;
  date: string;
}

interface InitData {
  weekMoods: any[];
  streakDates: string[];
  journals: { data: any[]; hasMore: boolean };
  breathing: any[];
  seeds: { balance: number; history: SeedHistoryEntry[] };
  unreadReplies: number;
  goals: any[];
  tasks: any[];
  moodOptions: any[];
  loading: boolean;
  reload: () => void;
}

const defaultData: InitData = {
  weekMoods: [],
  streakDates: [],
  journals: { data: [], hasMore: false },
  breathing: [],
  seeds: { balance: 0, history: [] },
  unreadReplies: 0,
  goals: [],
  tasks: [],
  moodOptions: [],
  loading: true,
  reload: () => {},
};

const InitContext = createContext<InitData>(defaultData);

export function InitProvider({ children }: { children: React.ReactNode }) {
  const { user, accessToken, isAnonymous } = useAuth();
  const [data, setData] = useState<InitData>(defaultData);

  const load = useCallback(async () => {
    if (!accessToken || isAnonymous) {
      setData((prev) => ({ ...prev, loading: false }));
      return;
    }
    const lastSeen = typeof window !== "undefined" ? localStorage.getItem("feedback-last-seen") || "2000-01-01" : "2000-01-01";
    try {
      const res = await fetch("/api/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken, feedbackLastSeen: lastSeen }),
      });
      if (res.ok) {
        const json = await res.json();
        setData({
          weekMoods: json.weekMoods || [],
          streakDates: json.streakDates || [],
          journals: json.journals || { data: [], hasMore: false },
          breathing: json.breathing || [],
          seeds: json.seeds || { balance: 0, history: [] },
          unreadReplies: json.unreadReplies || 0,
          goals: json.goals || [],
          tasks: json.tasks || [],
          moodOptions: json.moodOptions || [],
          loading: false,
          reload: load,
        });
        // Update localStorage seeds to match DB
        if (typeof window !== "undefined" && json.seeds?.balance !== undefined) {
          localStorage.setItem("pm-seeds", String(json.seeds.balance));
          window.dispatchEvent(new CustomEvent("seeds-changed", { detail: json.seeds.balance }));
        }
      } else {
        setData((prev) => ({ ...prev, loading: false, reload: load }));
      }
    } catch {
      setData((prev) => ({ ...prev, loading: false, reload: load }));
    }
  }, [accessToken, isAnonymous]);

  useEffect(() => {
    load();
  }, [load]);

  // Make reload available
  const value = { ...data, reload: load };

  return <InitContext.Provider value={value}>{children}</InitContext.Provider>;
}

export function useInit() {
  return useContext(InitContext);
}
