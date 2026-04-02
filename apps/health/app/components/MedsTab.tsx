"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";

export default function MedsTab() {
  const { t, lang } = useI18n();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [frequency, setFrequency] = useState("daily");

  const frequencies = [
    { id: "daily", label: t("meds.daily") },
    { id: "twiceDaily", label: t("meds.twiceDaily") },
    { id: "weekly", label: t("meds.weekly") },
    { id: "asNeeded", label: t("meds.asNeeded") },
  ];

  return (
    <section className="py-6 px-4">
      <div className="max-w-sm md:max-w-lg mx-auto">
        <h2 className="text-xl font-semibold text-pm-text mb-1 text-center">{t("meds.title")}</h2>
        <p className="text-sm text-pm-text-tertiary mb-6 text-center">
          {lang === "zh" ? "管理你的药物和补充剂" : "Manage your medications and supplements"}
        </p>

        {/* Placeholder — no meds yet */}
        <div className="bg-pm-surface rounded-2xl p-6 text-center mb-4">
          <p className="text-3xl mb-2">💊</p>
          <p className="text-sm text-pm-text-tertiary">
            {lang === "zh" ? "还没有添加药物" : "No medications added yet"}
          </p>
        </div>

        {showAdd ? (
          <div className="bg-pm-surface rounded-2xl p-5 space-y-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("meds.name")}
              className="w-full px-3 py-2 rounded-xl bg-pm-surface-active border border-pm-border text-pm-text text-sm focus:outline-none focus:ring-2 focus:ring-brand-light"
              autoFocus
            />
            <input
              type="text"
              value={dose}
              onChange={(e) => setDose(e.target.value)}
              placeholder={t("meds.dose")}
              className="w-full px-3 py-2 rounded-xl bg-pm-surface-active border border-pm-border text-pm-text text-sm focus:outline-none focus:ring-2 focus:ring-brand-light"
            />
            <div className="flex flex-wrap gap-1.5">
              {frequencies.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFrequency(f.id)}
                  className={`px-3 py-1.5 rounded-full text-xs cursor-pointer transition-all ${
                    frequency === f.id ? "bg-brand text-white" : "bg-pm-surface-active text-pm-text-secondary hover:bg-pm-surface-hover"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button disabled={!name.trim()} className="flex-1 py-2 rounded-full text-sm font-medium bg-brand text-white cursor-pointer disabled:opacity-40">{t("save")}</button>
              <button onClick={() => { setShowAdd(false); setName(""); setDose(""); }} className="px-4 py-2 rounded-full text-sm bg-pm-surface-active text-pm-text-secondary cursor-pointer">{t("cancel")}</button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAdd(true)}
            className="w-full py-3 rounded-2xl border-2 border-dashed border-pm-border text-sm text-brand hover:bg-white/30 cursor-pointer transition-all"
          >
            + {t("meds.add")}
          </button>
        )}
      </div>
    </section>
  );
}
