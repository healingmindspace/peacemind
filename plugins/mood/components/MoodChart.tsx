"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useI18n } from "@/lib/i18n";

interface MoodEntry {
  id: string;
  emoji: string;
  label: string;
  created_at: string;
}

// Dynamic emoji scoring — same as MoodTracker
function getEmojiScore(emojis: string): number {
  const great = "🥳🤩😍🥰🎉💪✨🌟😎🤗💃🕺🏆🎊👏";
  const good = "😊🙂😄😁👍🌈☺️😌🫶🙏💚🍀😋🤭";
  const low = "😔😞😓😟🥺😿💔🫤😕☹️😩🤕";
  const struggling = "😢😭😰😱💀👎😡😤🤬😖😫🆘😵🤮";
  for (const ch of emojis) {
    if (great.includes(ch)) return 5;
    if (good.includes(ch)) return 4;
    if (low.includes(ch)) return 2;
    if (struggling.includes(ch)) return 1;
  }
  return 3;
}

// Also support legacy label-based scoring
const MOOD_LEVEL: Record<string, number> = {
  Struggling: 1, Low: 2, Neutral: 3, Okay: 4, Good: 5, Great: 5,
};

function formatDateShort(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip(props: any) {
  const { active, payload } = props;
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-xl px-4 py-2 shadow-md text-sm">
      <p>
        <span className="text-lg mr-1">{d.emoji}</span>
        <span className="text-pm-text font-medium">{d.label}</span>
      </p>
      <p className="text-pm-text-tertiary text-xs">{d.fullDate}</p>
    </div>
  );
}

type TimeRange = "week" | "month" | "3months";

interface MoodChartProps {
  history: MoodEntry[];
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
}

export default function MoodChart({ history, timeRange, onTimeRangeChange }: MoodChartProps) {
  const { t } = useI18n();

  if (history.length < 2) return null;

  const useShortDate = timeRange !== "week";

  const data = [...history]
    .reverse()
    .map((entry) => {
      // Score from emoji first, fall back to label
      const level = getEmojiScore(entry.emoji) || MOOD_LEVEL[entry.label] || 3;
      return {
        date: useShortDate ? formatDateShort(entry.created_at) : formatTime(entry.created_at),
        fullDate: formatTime(entry.created_at),
        level,
        emoji: entry.emoji,
        label: entry.label,
      };
    });

  // Dynamic range based on actual data
  const levels = data.map((d) => d.level);
  const minLevel = Math.max(1, Math.min(...levels) - 1);
  const maxLevel = Math.min(5, Math.max(...levels) + 1);
  const ticks = Array.from({ length: maxLevel - minLevel + 1 }, (_, i) => minLevel + i);

  const TICK_EMOJI: Record<number, string> = { 1: "😢", 2: "😔", 3: "😐", 4: "🙂", 5: "😊" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function EmojiTick(props: any) {
    const { x, y, payload } = props;
    return (
      <text x={x - 20} y={y + 5} textAnchor="middle" fontSize={14}>
        {TICK_EMOJI[payload?.value as number] ?? ""}
      </text>
    );
  }

  const rangeLabels: Record<TimeRange, string> = {
    week: t("chart.week"),
    month: t("chart.month"),
    "3months": t("chart.3mo"),
  };

  return (
    <div className="mt-6 max-w-sm md:max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4 px-1">
        <h3 className="text-sm font-semibold text-pm-text">
          {t("mood.yourMood")}
        </h3>
        <div className="flex gap-1">
          {(Object.keys(rangeLabels) as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => onTimeRangeChange(range)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                timeRange === range
                  ? "bg-brand text-white"
                  : "bg-pm-surface-active text-pm-text-secondary"
              }`}
            >
              {rangeLabels[range]}
            </button>
          ))}
        </div>
      </div>
      <div className="h-[200px] md:h-[280px]"><ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e8dff0" />
          <XAxis
            dataKey="date"
            tick={{ fill: "#8a7da0", fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: "#d8cfe8" }}
          />
          <YAxis
            domain={[minLevel, maxLevel]}
            ticks={ticks}
            tick={<EmojiTick />}
            tickLine={false}
            axisLine={{ stroke: "#d8cfe8" }}
            width={40}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="level"
            stroke="#7c6a9e"
            strokeWidth={3}
            dot={{ r: 4, fill: "#7c6a9e", stroke: "#fff", strokeWidth: 2 }}
            activeDot={{ r: 6, fill: "#5a4a7a", stroke: "#fff", strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}
