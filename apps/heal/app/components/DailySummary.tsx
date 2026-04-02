"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";

export default function DailySummary() {
  const { user, accessToken } = useAuth();
  const [moodCount, setMoodCount] = useState(0);
  const [moodEmojis, setMoodEmojis] = useState<string[]>([]);
  const [journalCount, setJournalCount] = useState(0);
  const [breathCount, setBreathCount] = useState(0);

  useEffect(() => {
    if (user && accessToken) loadSummary();
  }, [user, accessToken]);

  useEffect(() => {
    const handleBreath = () => {
      if (user && accessToken) loadSummary();
    };
    window.addEventListener("breathe-complete", handleBreath);
    return () => window.removeEventListener("breathe-complete", handleBreath);
  }, [user, accessToken]);

  const loadSummary = async () => {
    if (!accessToken) return;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [moodsJson, journalsJson, breathingJson] = await Promise.all([
      fetch("/api/mood", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list", accessToken, since: todayStart.toISOString(), limit: 10 }),
      }).then((r) => r.json()),
      fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list", accessToken }),
      }).then((r) => r.json()),
      fetch("/api/breathing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list", accessToken, since: todayStart.toISOString(), limit: 20 }),
      }).then((r) => r.json()),
    ]);

    const moods = (moodsJson.data || []).filter((m: { created_at: string }) => new Date(m.created_at) >= todayStart);
    setMoodCount(moods.length);
    setMoodEmojis(moods.map((m: { emoji: string }) => m.emoji));

    const journals = (journalsJson.data || []).filter((j: { created_at: string }) => new Date(j.created_at) >= todayStart);
    setJournalCount(journals.length);

    setBreathCount((breathingJson.data || []).length);
  };

  if (!user) return null;

  return (
    <div className="flex justify-center gap-5 pb-4 text-sm text-pm-text-secondary">
      <span>
        {moodCount > 0 ? moodEmojis.join("") : "😶"}{" "}
        <span className="text-xs">{moodCount} mood{moodCount !== 1 ? "s" : ""}</span>
      </span>
      <span>
        🫧 <span className="text-xs">{breathCount} session{breathCount !== 1 ? "s" : ""}</span>
      </span>
      <span>
        📝 <span className="text-xs">{journalCount} entr{journalCount !== 1 ? "ies" : "y"}</span>
      </span>
    </div>
  );
}
