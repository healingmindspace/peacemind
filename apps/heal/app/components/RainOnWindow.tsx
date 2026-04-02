"use client";

import { useState, useEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n";

function createRainSound(audioCtx: AudioContext): { gain: GainNode; stop: () => void } {
  // Brown noise filtered to sound like rain
  const bufferSize = 2 * audioCtx.sampleRate;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);

  let lastOut = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    data[i] = (lastOut + 0.02 * white) / 1.02;
    lastOut = data[i];
    data[i] *= 3.5;
  }

  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  // Filter to make it sound more like rain
  const filter = audioCtx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 800;

  const gain = audioCtx.createGain();
  gain.gain.value = 0;

  source.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);
  source.start();

  return {
    gain,
    stop: () => {
      try { source.stop(); } catch { /* already stopped */ }
    },
  };
}

export default function RainOnWindow() {
  const [playing, setPlaying] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const audioRef = useRef<{ gain: GainNode; stop: () => void } | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { lang } = useI18n();

  const start = () => {
    const ctx = new AudioContext();
    ctxRef.current = ctx;
    const rain = createRainSound(ctx);
    audioRef.current = rain;

    // Fade in
    rain.gain.gain.setValueAtTime(0, ctx.currentTime);
    rain.gain.gain.linearRampToValueAtTime(0.7, ctx.currentTime + 2);

    setPlaying(true);
    setSeconds(0);
    timerRef.current = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
  };

  const stop = () => {
    if (audioRef.current && ctxRef.current) {
      const ctx = ctxRef.current;
      // Fade out
      audioRef.current.gain.gain.setValueAtTime(audioRef.current.gain.gain.value, ctx.currentTime);
      audioRef.current.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);
      setTimeout(() => {
        audioRef.current?.stop();
        ctxRef.current?.close();
        audioRef.current = null;
        ctxRef.current = null;
      }, 1600);
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setPlaying(false);
    setSeconds(0);
  };

  useEffect(() => {
    return () => {
      audioRef.current?.stop();
      ctxRef.current?.close();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <section className="py-6 px-4 text-center">
      <h2 className="text-lg font-semibold text-pm-text mb-1">
        {lang === "zh" ? "🌧️ 窗外的雨" : "🌧️ Rain on Window"}
      </h2>
      <p className="text-xs text-pm-text-secondary mb-6">
        {lang === "zh" ? "闭上眼睛，听雨声，慢慢呼吸" : "Close your eyes, listen to the rain, breathe slowly"}
      </p>

      <div className="flex flex-col items-center">
        {/* Rain circle */}
        <div className="w-48 h-48 flex items-center justify-center mb-6">
          <div
            className={`w-36 h-36 rounded-full flex items-center justify-center transition-all duration-1000 ${
              playing
                ? "bg-gradient-to-br from-[#7b9cb5] to-[#5a7d99] shadow-lg scale-105"
                : "bg-gradient-to-br from-pm-accent to-pm-surface-active"
            }`}
          >
            {playing ? (
              <span className="text-white text-lg font-light">{formatTime(seconds)}</span>
            ) : (
              <span className="text-3xl">🌧️</span>
            )}
          </div>
        </div>

        <button
          onClick={playing ? stop : start}
          className={`px-8 py-3 rounded-full font-medium transition-all cursor-pointer ${
            playing
              ? "bg-pm-surface-active text-pm-text-secondary hover:bg-pm-surface-hover"
              : "bg-brand text-white hover:bg-brand-hover"
          }`}
        >
          {playing
            ? (lang === "zh" ? "停止" : "Stop")
            : (lang === "zh" ? "开始听雨" : "Listen")}
        </button>
      </div>
    </section>
  );
}
