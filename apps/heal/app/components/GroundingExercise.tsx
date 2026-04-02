"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";

const STEPS = [
  { sense: "see", emoji: "👀", count: 5 },
  { sense: "hear", emoji: "👂", count: 4 },
  { sense: "touch", emoji: "✋", count: 3 },
  { sense: "smell", emoji: "🌸", count: 2 },
  { sense: "taste", emoji: "👅", count: 1 },
];

export default function GroundingExercise() {
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [done, setDone] = useState(false);
  const { t } = useI18n();
  const { user, accessToken } = useAuth();

  const step = STEPS[stepIndex];

  const next = () => {
    if (stepIndex < STEPS.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      setDone(true);
      // Save session
      if (user && accessToken) {
        fetch("/api/breathing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "insert", accessToken, method: "5-4-3-2-1 Grounding" }),
        });
      }
    }
  };

  const reset = () => {
    setActive(false);
    setStepIndex(0);
    setDone(false);
  };

  if (!active) {
    return (
      <div className="max-w-sm mx-auto text-center mt-6 mb-2">
        <button
          onClick={() => setActive(true)}
          className="px-6 py-3 rounded-2xl bg-pm-surface hover:bg-white/70 transition-all cursor-pointer"
        >
          <span className="text-lg">🌿</span>
          <p className="text-sm font-medium text-pm-text mt-1">{t("ground.title")}</p>
          <p className="text-xs text-pm-text-tertiary">{t("ground.subtitle")}</p>
        </button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="max-w-sm mx-auto text-center mt-6 mb-2">
        <div className="bg-pm-surface rounded-2xl p-6">
          <p className="text-3xl mb-3">🌿</p>
          <p className="text-sm text-pm-text font-medium">{t("ground.done")}</p>
          <p className="text-xs text-pm-text-tertiary mt-1">{t("ground.doneDesc")}</p>
          <button
            onClick={reset}
            className="mt-4 text-xs text-pm-text-muted hover:text-brand cursor-pointer"
          >
            {t("ground.close")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto text-center mt-6 mb-2">
      <div className="bg-pm-surface rounded-2xl p-6">
        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 mb-4">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all ${
                i < stepIndex ? "bg-brand" : i === stepIndex ? "bg-brand scale-125" : "bg-pm-accent"
              }`}
            />
          ))}
        </div>

        <p className="text-4xl mb-3">{step.emoji}</p>
        <p className="text-lg font-semibold text-pm-text">
          {t(`ground.step.${step.sense}`, { count: step.count })}
        </p>
        <p className="text-xs text-pm-text-tertiary mt-1 mb-5">
          {t(`ground.hint.${step.sense}`)}
        </p>

        <div className="flex justify-center gap-3">
          <button
            onClick={next}
            className="px-8 py-2.5 rounded-full text-sm font-medium bg-brand text-white cursor-pointer hover:bg-brand-hover transition-colors"
          >
            {stepIndex < STEPS.length - 1 ? t("ground.next") : t("ground.finish")}
          </button>
          <button
            onClick={reset}
            className="px-4 py-2.5 rounded-full text-xs text-pm-text-muted hover:text-brand cursor-pointer"
          >
            {t("ground.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
