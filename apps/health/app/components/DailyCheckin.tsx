"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";

export default function DailyCheckin() {
  const [energy, setEnergy] = useState(3);
  const [pain, setPain] = useState(0);
  const [sleep, setSleep] = useState(3);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { t } = useI18n();
  const supabase = useMemo(() => createClient(), []);

  const save = async () => {
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSaving(false); return; }

    await fetch("/api/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "insert", accessToken: session.access_token, energy, pain, sleep, notes: notes.trim() || null }),
    });

    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 2000);
  };

  const Slider = ({ label, value, onChange, leftLabel, rightLabel, max = 5 }: {
    label: string; value: number; onChange: (v: number) => void;
    leftLabel: string; rightLabel: string; max?: number;
  }) => (
    <div className="mb-5">
      <div className="flex justify-between mb-1">
        <p className="text-sm font-medium text-pm-text">{label}</p>
        <p className="text-sm text-pm-text-tertiary">{value}/{max}</p>
      </div>
      <input
        type="range"
        min={0}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full accent-[#4a7a4a]"
      />
      <div className="flex justify-between text-[10px] text-pm-text-muted">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
    </div>
  );

  return (
    <section className="py-6 px-4">
      <div className="max-w-sm md:max-w-lg mx-auto">
        <h2 className="text-xl font-semibold text-pm-text mb-1 text-center">{t("checkin.title")}</h2>
        <p className="text-sm text-pm-text-tertiary mb-6 text-center">{t("checkin.subtitle")}</p>

        <div className="bg-pm-surface rounded-2xl p-5">
          <Slider label={t("checkin.energy")} value={energy} onChange={setEnergy} leftLabel={t("checkin.low")} rightLabel={t("checkin.high")} />
          <Slider label={t("checkin.pain")} value={pain} onChange={setPain} leftLabel={t("checkin.none")} rightLabel={t("checkin.severe")} />
          <Slider label={t("checkin.sleep")} value={sleep} onChange={setSleep} leftLabel={t("checkin.poor")} rightLabel={t("checkin.great")} />

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("checkin.notes")}
            rows={2}
            className="w-full px-3 py-2 rounded-xl bg-pm-surface-active border border-pm-border text-pm-text text-sm focus:outline-none focus:ring-2 focus:ring-brand-light resize-none mb-4"
          />

          <button
            onClick={save}
            disabled={saving || saved}
            className="w-full py-2.5 rounded-full text-sm font-medium bg-brand text-white cursor-pointer disabled:opacity-40 transition-all"
          >
            {saved ? t("checkin.saved") : saving ? "..." : t("checkin.save")}
          </button>
        </div>
      </div>
    </section>
  );
}
