"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";

interface ReviewData {
  review: string;
  stats: {
    totalCompleted: number;
    totalIncomplete: number;
    journalCount: number;
    byGoal: { name: string; icon: string; completed: number; remaining: number }[];
  };
}

export default function WeeklyReview({ user }: { user: { id: string } }) {
  const [data, setData] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const { t, lang } = useI18n();
  const { accessToken } = useAuth();

  const loadReview = async () => {
    setLoading(true);

    const cacheKey = `grow-review-unified`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.ts < 60 * 60 * 1000) {
        setData(parsed);
        setLoading(false);
        return;
      }
    }

    if (!accessToken) { setLoading(false); return; }

    try {
      const res = await fetch("/api/goal-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken, lang, period: "thisWeek" }),
      });
      const json = await res.json();
      if (json.review) {
        const d = { review: json.review, stats: json.stats, ts: Date.now() };
        setData(d);
        localStorage.setItem(cacheKey, JSON.stringify(d));
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  return (
    <div className="max-w-sm md:max-w-lg mx-auto">
      <h2 className="text-xl font-semibold text-pm-text mb-1 text-center">{t("goals.reviewTitle")}</h2>
      <p className="text-sm text-pm-text-secondary mb-4 text-center">{t("goals.reviewSubtitle")}</p>

      {!data && !loading && (
        <button
          onClick={loadReview}
          className="w-full py-4 rounded-2xl bg-pm-surface hover:bg-white/70 transition-all cursor-pointer text-center"
        >
          <span className="text-2xl">✨</span>
          <p className="text-sm font-medium text-brand mt-1">{lang === "zh" ? "生成回顾" : "Generate Review"}</p>
          <p className="text-xs text-pm-text-muted">{lang === "zh" ? "Healer 为你总结本周进展" : "Healer summarizes your week"}</p>
        </button>
      )}

      {loading && (
        <div className="bg-pm-surface rounded-2xl p-4 text-center">
          <p className="text-xs text-pm-text-muted italic">{t("goals.reviewLoading")}</p>
        </div>
      )}

      {data && (
        <>
          {/* Per-path cards */}
          {data.stats.byGoal.length > 0 && (
            <div className="space-y-3 mb-4">
              {data.stats.byGoal.map((g) => {
                const total = g.completed + g.remaining;
                const percent = total > 0 ? Math.round((g.completed / total) * 100) : 0;
                return (
                  <div key={g.name} className="bg-pm-surface rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{g.icon}</span>
                      <p className="text-sm font-semibold text-pm-text flex-1">{g.name}</p>
                      <span className="text-xs text-pm-text-tertiary">{g.completed}/{total}</span>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full h-1.5 bg-pm-accent rounded-full mb-2">
                      <div className="h-1.5 bg-brand rounded-full transition-all" style={{ width: `${percent}%` }} />
                    </div>
                    <div className="flex gap-4 text-[10px] text-pm-text-tertiary">
                      {g.completed > 0 && (
                        <span>✓ {g.completed} {lang === "zh" ? "已完成" : "done"}</span>
                      )}
                      {g.remaining > 0 && (
                        <span>○ {g.remaining} {lang === "zh" ? "待完成" : "to go"}</span>
                      )}
                      {total === 0 && (
                        <span>{lang === "zh" ? "还没有步骤" : "No steps yet"}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Summary stats */}
          <div className="flex justify-center gap-4 mb-4 text-center">
            <div>
              <p className="text-lg font-semibold text-brand">{data.stats.totalCompleted}</p>
              <p className="text-[10px] text-pm-text-tertiary">{t("goals.stepsCompleted")}</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-pm-text-muted">{data.stats.totalIncomplete}</p>
              <p className="text-[10px] text-pm-text-tertiary">{t("goals.stepsRemaining")}</p>
            </div>
            {data.stats.journalCount > 0 && (
              <div>
                <p className="text-lg font-semibold text-brand-light">{data.stats.journalCount}</p>
                <p className="text-[10px] text-pm-text-tertiary">{t("goals.journalEntries")}</p>
              </div>
            )}
          </div>

          {/* AI encouragement */}
          {data.review && (
            <div className="bg-pm-accent-light/50 rounded-2xl p-4">
              <p className="text-sm text-pm-text-secondary leading-relaxed whitespace-pre-wrap">{data.review}</p>
            </div>
          )}

          <button
            onClick={() => { localStorage.removeItem("grow-review-unified"); loadReview(); }}
            className="mt-3 w-full text-xs text-pm-text-muted hover:text-brand cursor-pointer text-center"
          >
            ↻ {t("goals.refreshReview")}
          </button>
        </>
      )}

      {!user && (
        <p className="text-sm text-pm-text-muted text-center">{t("goals.signIn")}</p>
      )}
    </div>
  );
}
