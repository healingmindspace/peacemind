"use client";

import { useState, useEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n";

function playBell(audioCtx: AudioContext) {
  // Gentle bell tone — sine wave with soft decay
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = "sine";
  osc.frequency.value = 528; // "healing frequency" — warm, gentle tone
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 3);

  osc.start(audioCtx.currentTime);
  osc.stop(audioCtx.currentTime + 3);
}

export default function OneMinutePause() {
  const [running, setRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [done, setDone] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const { lang } = useI18n();

  const start = () => {
    const ctx = new AudioContext();
    ctxRef.current = ctx;
    playBell(ctx); // Opening bell

    setRunning(true);
    setDone(false);
    setSecondsLeft(60);

    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          // Time's up
          clearInterval(timerRef.current!);
          playBell(ctx); // Closing bell
          setRunning(false);
          setDone(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  const stop = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setRunning(false);
    setSecondsLeft(60);
    setDone(false);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      ctxRef.current?.close();
    };
  }, []);

  const progress = (60 - secondsLeft) / 60;

  return (
    <section className="py-6 px-4 text-center">
      <h2 className="text-lg font-semibold text-pm-text mb-1">
        {lang === "zh" ? "⏸️ 一分钟暂停" : "⏸️ One-Minute Pause"}
      </h2>
      <p className="text-xs text-pm-text-secondary mb-6">
        {lang === "zh" ? "什么都不做。只是存在。" : "Do nothing. Just be."}
      </p>

      <div className="flex flex-col items-center">
        {/* Timer circle */}
        <div className="w-48 h-48 flex items-center justify-center mb-6 relative">
          {/* Progress ring */}
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50" cy="50" r="42"
              fill="none"
              stroke="var(--pm-accent)"
              strokeWidth="3"
            />
            {running && (
              <circle
                cx="50" cy="50" r="42"
                fill="none"
                stroke="var(--pm-brand)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 42}`}
                strokeDashoffset={`${2 * Math.PI * 42 * (1 - progress)}`}
                className="transition-all duration-1000 ease-linear"
              />
            )}
          </svg>

          <div className="flex flex-col items-center">
            {done ? (
              <>
                <span className="text-3xl mb-1">🕊️</span>
                <span className="text-xs text-pm-text-secondary">
                  {lang === "zh" ? "平静" : "Peace"}
                </span>
              </>
            ) : running ? (
              <span className="text-3xl font-light text-pm-text">{secondsLeft}</span>
            ) : (
              <span className="text-3xl">⏸️</span>
            )}
          </div>
        </div>

        {done ? (
          <button
            onClick={() => { setDone(false); setSecondsLeft(60); }}
            className="px-8 py-3 rounded-full text-sm font-medium bg-pm-surface-active text-pm-text-secondary hover:bg-pm-surface-hover transition-all cursor-pointer"
          >
            {lang === "zh" ? "完成" : "Done"}
          </button>
        ) : (
          <button
            onClick={running ? stop : start}
            className={`px-8 py-3 rounded-full font-medium transition-all cursor-pointer ${
              running
                ? "bg-pm-surface-active text-pm-text-secondary hover:bg-pm-surface-hover"
                : "bg-brand text-white hover:bg-brand-hover"
            }`}
          >
            {running
              ? (lang === "zh" ? "停止" : "Stop")
              : (lang === "zh" ? "开始" : "Begin")}
          </button>
        )}
      </div>
    </section>
  );
}
