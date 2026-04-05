"use client";

import { useI18n } from "@/lib/i18n";
import type { AiStep } from "./types";

interface AIPlanPanelProps {
  objectiveText: string;
  aiPlan: { message: string; steps: AiStep[] } | null;
  planLoading: boolean;
  saving: boolean;
  onObjectiveChange: (v: string) => void;
  onGenerate: () => void;
  onAccept: () => void;
  onRetry: () => void;
  onCancel: () => void;
  onUpdateSteps?: (steps: AiStep[]) => void;
}

export default function AIPlanPanel({
  objectiveText, aiPlan, planLoading, saving,
  onObjectiveChange, onGenerate, onAccept, onRetry, onCancel, onUpdateSteps,
}: AIPlanPanelProps) {
  const { t } = useI18n();

  const updateStep = (index: number, field: keyof AiStep, value: string | number) => {
    if (!aiPlan || !onUpdateSteps) return;
    const updated = aiPlan.steps.map((s, i) => i === index ? { ...s, [field]: value } : s);
    onUpdateSteps(updated);
  };

  const removeStep = (index: number) => {
    if (!aiPlan || !onUpdateSteps) return;
    onUpdateSteps(aiPlan.steps.filter((_, i) => i !== index));
  };

  return (
    <div className="mt-3 space-y-2">
      {!aiPlan && (
        <>
          <textarea
            value={objectiveText}
            onChange={(e) => onObjectiveChange(e.target.value)}
            placeholder={t("goals.objectivePlaceholder")}
            rows={2}
            className="w-full px-3 py-1.5 rounded-xl bg-pm-surface-active border border-pm-border text-pm-text text-xs focus:outline-none focus:ring-2 focus:ring-brand-light resize-none"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={onGenerate}
              disabled={planLoading || !objectiveText.trim()}
              className="px-3 py-1 rounded-full text-xs bg-brand text-white cursor-pointer disabled:opacity-40"
            >
              {planLoading ? t("goals.planning") : t("goals.planWithAi")}
            </button>
            <button
              onClick={onCancel}
              className="px-3 py-1 rounded-full text-xs bg-pm-surface-active text-pm-text-secondary cursor-pointer"
            >
              {t("tasks.cancel")}
            </button>
          </div>
        </>
      )}

      {planLoading && (
        <p className="text-xs text-pm-text-muted italic text-center py-2">{t("goals.planning")}</p>
      )}

      {aiPlan && (
        <div className="bg-pm-accent-light/50 rounded-xl p-3 space-y-2">
          {aiPlan.message && !aiPlan.message.startsWith("{") && (
            <p className="text-xs text-pm-text-secondary leading-relaxed">{aiPlan.message}</p>
          )}
          {aiPlan.steps.length === 0 && (
            <p className="text-xs text-pm-text-muted italic">{t("goals.planRetry")}</p>
          )}
          <div className="space-y-2">
            {aiPlan.steps.map((step, i) => (
              <div key={i} className="bg-pm-surface rounded-lg px-3 py-2 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-brand font-medium shrink-0">{i + 1}.</span>
                  <input
                    type="text"
                    value={step.title}
                    onChange={(e) => updateStep(i, "title", e.target.value)}
                    className="flex-1 text-xs text-pm-text font-medium bg-transparent border-b border-transparent focus:border-pm-border focus:outline-none"
                  />
                  <button
                    onClick={() => removeStep(i)}
                    className="text-[10px] text-pm-text-muted hover:text-red-400 cursor-pointer shrink-0"
                  >
                    ✕
                  </button>
                </div>
                <input
                  type="text"
                  value={step.description || ""}
                  onChange={(e) => updateStep(i, "description", e.target.value)}
                  placeholder="Description (optional)"
                  className="w-full text-[10px] text-pm-text-tertiary bg-transparent border-b border-transparent focus:border-pm-border focus:outline-none pl-5"
                />
                <p className="text-[10px] text-pm-text-muted pl-5">
                  {step.scheduleType === "habit" ? `${step.habitFreq} ${t("tasks.atTime")} ${step.habitTime}` : step.scheduleType === "gentle" ? t(`tasks.${step.gentle || "soon"}`) : t("tasks.once")}
                  {step.duration ? ` · ${step.duration}${t("tasks.min")}` : ""}
                </p>
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={onAccept}
              disabled={saving || aiPlan.steps.length === 0}
              className="px-3 py-1 rounded-full text-xs bg-brand text-white cursor-pointer disabled:opacity-40"
            >
              {saving ? "..." : t("goals.acceptPlan")}
            </button>
            <button
              onClick={onRetry}
              className="px-3 py-1 rounded-full text-xs bg-pm-surface-active text-pm-text-secondary cursor-pointer"
            >
              {t("goals.tryAgain")}
            </button>
            <button
              onClick={onCancel}
              className="px-3 py-1 rounded-full text-xs bg-pm-surface-active text-pm-text-secondary cursor-pointer"
            >
              {t("tasks.cancel")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
