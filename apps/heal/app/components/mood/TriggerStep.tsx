"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";

interface Mood { emoji: string; label: string; labelKey: string; responseKey: string }

interface TriggerStepProps {
  moods: Mood[];
  selected: number | null;
  selectedTriggers: string[];
  customTrigger: string;
  customTriggers: { trigger: string; count: number }[];
  savedTriggers: { id: string; label: string }[];
  hiddenTriggerKeys: string[];
  triggerPattern: string | null;
  triggerKeys: string[];
  onSelectMood: (i: number) => void;
  onToggleTrigger: (key: string) => void;
  onToggleCustomTrigger: (trigger: string) => void;
  onCustomTriggerChange: (v: string) => void;
  onAddSaved: (label: string) => void;
  onDeleteSaved: (id: string) => void;
  onHidePreset: (key: string) => void;
  onShowAllPresets: () => void;
  onNext: () => void;
  onSkip: () => void;
}

export default function TriggerStep({
  moods, selected, selectedTriggers, customTrigger, customTriggers, savedTriggers,
  hiddenTriggerKeys, triggerPattern, triggerKeys,
  onSelectMood, onToggleTrigger, onToggleCustomTrigger, onCustomTriggerChange,
  onAddSaved, onDeleteSaved, onHidePreset, onShowAllPresets, onNext, onSkip,
}: TriggerStepProps) {
  const { t, lang } = useI18n();
  const [showAdd, setShowAdd] = useState(false);
  const [newLabel, setNewLabel] = useState("");

  const handleAdd = () => {
    if (!newLabel.trim()) return;
    onAddSaved(newLabel.trim());
    setNewLabel("");
    setShowAdd(false);
  };

  const visiblePresets = triggerKeys.filter((k) => !hiddenTriggerKeys.includes(k));
  const hasHidden = hiddenTriggerKeys.length > 0;

  const TagX = ({ onClick }: { onClick: () => void }) => (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="absolute top-1/2 -translate-y-1/2 right-1 w-4 h-4 rounded-full text-[10px] flex items-center justify-center cursor-pointer opacity-30 hover:opacity-70 text-pm-text-secondary transition-all"
    >×</button>
  );

  return (
    <div className="mt-4 max-w-sm md:max-w-lg mx-auto">
      {/* Emoji picker */}
      <div className="flex justify-center gap-2 flex-wrap mb-3">
        {moods.map((mood, i) => (
          <button
            key={i}
            onClick={() => onSelectMood(i)}
            className={`flex flex-col items-center gap-0.5 p-2 rounded-xl transition-all cursor-pointer ${
              selected === i ? "bg-brand text-white scale-110 shadow-md" : "bg-pm-surface-active hover:bg-pm-surface-hover"
            }`}
          >
            <span className="text-xl">{mood.emoji}</span>
            <span className="text-[10px]">{t(mood.labelKey)}</span>
          </button>
        ))}
      </div>
      <p className="text-sm text-pm-text-secondary font-medium text-center mb-3">{t("mood.whatHappened")}</p>

      {/* Saved custom triggers */}
      {savedTriggers.length > 0 && (
        <div className="flex flex-wrap gap-1.5 justify-center mb-2">
          {savedTriggers.map((opt) => (
            <div key={opt.id} className="relative">
              <button
                onClick={() => onToggleCustomTrigger(opt.label)}
                className={`px-3 py-1.5 pr-5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  selectedTriggers.includes(`custom:${opt.label}`) ? "bg-brand text-white" : "bg-pm-accent-light text-brand hover:bg-pm-accent"
                }`}
              >
                {opt.label}
              </button>
              <TagX onClick={() => onDeleteSaved(opt.id)} />
            </div>
          ))}
        </div>
      )}

      {/* Frequent triggers from history */}
      {customTriggers.length > 0 && (
        <div className="flex flex-wrap gap-1.5 justify-center mb-2">
          {customTriggers.filter((ct) => !savedTriggers.some((s) => s.label === ct.trigger)).map(({ trigger, count }) => (
            <button
              key={trigger}
              onClick={() => onToggleCustomTrigger(trigger)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                selectedTriggers.includes(`custom:${trigger}`) ? "bg-brand text-white" : "bg-pm-accent text-pm-text-secondary hover:bg-pm-accent"
              }`}
            >
              {trigger} <span className="opacity-60">({count})</span>
            </button>
          ))}
        </div>
      )}

      {/* Preset triggers */}
      <div className="flex flex-wrap gap-1.5 justify-center mb-2">
        {visiblePresets.map((key) => (
          <div key={key} className="relative">
            <button
              onClick={() => onToggleTrigger(key)}
              className={`px-3 py-1.5 pr-5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                selectedTriggers.includes(key) ? "bg-brand text-white" : "bg-pm-surface-active text-pm-text-secondary hover:bg-pm-surface-hover"
              }`}
            >
              {t(key)}
            </button>
            <TagX onClick={() => onHidePreset(key)} />
          </div>
        ))}
      </div>

      {/* Add tag / Show hidden */}
      <div className="flex justify-center gap-3 mb-3">
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="text-[10px] text-pm-text-muted hover:text-brand cursor-pointer"
        >
          + {lang === "zh" ? "添加标签" : "Add tag"}
        </button>
        {hasHidden && (
          <button
            onClick={onShowAllPresets}
            className="text-[10px] text-pm-text-muted hover:text-brand cursor-pointer"
          >
            {lang === "zh" ? `显示全部 (${hiddenTriggerKeys.length} 隐藏)` : `Show all (${hiddenTriggerKeys.length} hidden)`}
          </button>
        )}
      </div>

      {/* Add new trigger input */}
      {showAdd && (
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder={lang === "zh" ? "输入新标签..." : "New trigger tag..."}
            className="flex-1 px-3 py-1.5 rounded-xl bg-pm-surface-active border border-pm-border text-pm-text text-xs focus:outline-none focus:ring-2 focus:ring-brand-light"
            autoFocus
          />
          <button
            onClick={handleAdd}
            disabled={!newLabel.trim()}
            className="px-3 py-1.5 rounded-full text-xs bg-brand text-white cursor-pointer disabled:opacity-40"
          >
            {lang === "zh" ? "保存" : "Save"}
          </button>
        </div>
      )}

      {/* Custom text input */}
      <input
        type="text"
        placeholder={lang === "zh" ? "或输入具体事件..." : "Or type what happened..."}
        value={customTrigger}
        onChange={(e) => onCustomTriggerChange(e.target.value)}
        className="w-full px-4 py-2 rounded-xl bg-pm-surface-active border border-pm-border text-pm-text text-xs placeholder-pm-placeholder focus:outline-none focus:ring-2 focus:ring-brand-light mb-3"
      />

      {/* Pattern detection */}
      {triggerPattern && <p className="text-xs text-pm-text-tertiary italic mb-3">{triggerPattern}</p>}

      <div className="flex justify-center gap-3">
        <button onClick={onNext} disabled={selected === null} className="px-6 py-2 rounded-full text-xs font-medium bg-brand text-white cursor-pointer disabled:opacity-40">{t("mood.done")}</button>
        <button onClick={onSkip} disabled={selected === null} className="px-6 py-2 rounded-full text-xs font-medium bg-pm-surface-active text-pm-text-secondary cursor-pointer disabled:opacity-40">{t("mood.skip")}</button>
      </div>
    </div>
  );
}
