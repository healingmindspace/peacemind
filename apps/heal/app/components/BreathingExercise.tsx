"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { awardSeeds } from "@/lib/seeds";


type Phase = "idle" | "inhale" | "hold" | "exhale" | "hold2";

const PHASE_CLASSES: Record<Phase, string> = {
  idle: "",
  inhale: "animate-breathe-in",
  hold: "animate-breathe-hold",
  exhale: "animate-breathe-out",
  hold2: "animate-breathe-hold",
};

export default function BreathingExercise() {
  const [methodIndex, setMethodIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [cycle, setCycle] = useState(0);
  const [running, setRunning] = useState(false);
  const { user, accessToken } = useAuth();
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);
  const { t } = useI18n();

  const methods = [
    {
      name: t("breathe.box"),
      description: t("breathe.boxDesc"),
      phases: [
        { phase: "inhale" as Phase, duration: 4000 },
        { phase: "hold" as Phase, duration: 4000 },
        { phase: "exhale" as Phase, duration: 4000 },
        { phase: "hold2" as Phase, duration: 4000 },
      ],
      cycles: 4,
    },
    {
      name: t("breathe.relax"),
      description: t("breathe.relaxDesc"),
      phases: [
        { phase: "inhale" as Phase, duration: 4000 },
        { phase: "hold" as Phase, duration: 7000 },
        { phase: "exhale" as Phase, duration: 8000 },
      ],
      cycles: 4,
    },
    {
      name: t("breathe.simple"),
      description: t("breathe.simpleDesc"),
      phases: [
        { phase: "inhale" as Phase, duration: 4000 },
        { phase: "exhale" as Phase, duration: 4000 },
      ],
      cycles: 5,
    },
  ];

  const phaseLabels: Record<Phase, string> = {
    idle: t("breathe.start"),
    inhale: t("breathe.in"),
    hold: t("breathe.hold"),
    exhale: t("breathe.out"),
    hold2: t("breathe.hold"),
  };

  const method = methods[methodIndex];

  // user and accessToken come from useAuth()

  const clearTimeouts = () => {
    timeouts.current.forEach(clearTimeout);
    timeouts.current = [];
  };

  const runCycle = useCallback(
    (currentCycle: number) => {
      let delay = 0;
      for (const step of method.phases) {
        const capturedPhase = step.phase;
        const capturedDuration = step.duration;
        const tt = setTimeout(() => {
          setPhase(capturedPhase);
          document.documentElement.style.setProperty(
            "--breathe-duration",
            `${capturedDuration}ms`
          );
        }, delay);
        timeouts.current.push(tt);
        delay += step.duration;
      }

      const tt = setTimeout(() => {
        const next = currentCycle + 1;
        if (next < method.cycles) {
          setCycle(next);
          runCycle(next);
        } else {
          setPhase("idle");
          setRunning(false);
          setCycle(0);
          if (user && accessToken) {
            fetch("/api/breathing", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "insert", userId: user.id, accessToken, method: methods[methodIndex].name }),
            }).then(() => {
              window.dispatchEvent(new Event("breathe-complete"));
              awardSeeds("breathing");
            });
          }
        }
      }, delay);
      timeouts.current.push(tt);
    },
    [method]
  );

  const start = () => {
    clearTimeouts();
    setCycle(0);
    setRunning(true);
    runCycle(0);
  };

  const stop = () => {
    clearTimeouts();
    setPhase("idle");
    setRunning(false);
    setCycle(0);
  };

  useEffect(() => {
    return () => clearTimeouts();
  }, []);

  return (
    <section className="py-6 px-4 text-center">
      <h2 className="text-xl font-semibold text-pm-text mb-1">
        {t("breathe.title")}
      </h2>
      <p className="text-sm text-pm-text-secondary mb-3">
        {t("breathe.subtitle")}
      </p>
      <details className="max-w-sm mx-auto mb-6 text-left">
        <summary className="text-xs text-pm-text-muted cursor-pointer hover:text-brand text-center">
          {t("breathe.why")}
        </summary>
        <p className="text-xs text-pm-text-tertiary leading-relaxed mt-2 bg-pm-surface rounded-xl p-3">
          {t("breathe.whyText")}
        </p>
      </details>

      <div className="flex justify-center gap-2 flex-wrap mb-6">
        {methods.map((m, i) => (
          <button
            key={i}
            onClick={() => { if (!running) setMethodIndex(i); }}
            className={`px-4 py-2 rounded-full text-xs font-medium transition-all cursor-pointer ${
              methodIndex === i
                ? "bg-brand text-white shadow-md"
                : "bg-pm-surface-active text-pm-text-secondary hover:bg-pm-surface-hover"
            } ${running && methodIndex !== i ? "opacity-40 cursor-not-allowed" : ""}`}
          >
            {m.name}
          </button>
        ))}
      </div>

      <p className="text-xs text-pm-text-tertiary mb-4">{method.description}</p>

      <div className="flex flex-col items-center">
        <div className="w-64 h-64 flex items-center justify-center">
          <div
            className={`w-40 h-40 rounded-full bg-gradient-to-br from-brand-light to-[#e8c4d8] flex items-center justify-center transition-all duration-300 ${PHASE_CLASSES[phase]}`}
          >
            <span className="text-white text-lg font-medium px-2 text-center">
              {phaseLabels[phase]}
            </span>
          </div>
        </div>

        <div className="mt-4">
          {running ? (
            <>
              <p className="text-pm-text-secondary mb-4">
                {t("breathe.cycle", { current: cycle + 1, total: method.cycles })}
              </p>
              <button
                onClick={stop}
                className="px-8 py-3 rounded-full bg-[#a0909e] text-white font-medium hover:bg-[#8a7d8a] transition-colors cursor-pointer"
              >
                {t("breathe.stop")}
              </button>
            </>
          ) : (
            <button
              onClick={start}
              className="px-8 py-3 rounded-full bg-brand text-white font-medium hover:bg-brand-hover transition-colors cursor-pointer"
            >
              {t("breathe.begin", { count: method.cycles })}
            </button>
          )}
        </div>
      </div>

    </section>
  );
}
