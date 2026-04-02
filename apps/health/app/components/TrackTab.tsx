"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";

type TrackSection = "sugar" | "symptoms" | "womens";

export default function TrackTab() {
  const [section, setSection] = useState<TrackSection>("symptoms");
  const { t, lang } = useI18n();

  const sections: { id: TrackSection; icon: string; label: string }[] = [
    { id: "symptoms", icon: "🛡️", label: t("symptom.title") },
    { id: "sugar", icon: "🩸", label: t("sugar.title") },
    { id: "womens", icon: "🌸", label: lang === "zh" ? "女性健康" : "Women's Health" },
  ];

  return (
    <section className="py-6 px-4">
      <div className="max-w-sm md:max-w-lg mx-auto">
        {/* Section selector */}
        <div className="flex justify-center gap-2 mb-6">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                section === s.id ? "bg-[#4a7a4a] text-white" : "bg-white/60 text-[#3d5a3d] hover:bg-white/80"
              }`}
            >
              {s.icon} {s.label}
            </button>
          ))}
        </div>

        {section === "symptoms" && <SymptomTracker />}
        {section === "sugar" && <BloodSugarTracker />}
        {section === "womens" && <WomensHealthTracker />}
      </div>
    </section>
  );
}

function SymptomTracker() {
  const { t, lang } = useI18n();
  const [severity, setSeverity] = useState(1);
  const [selectedType, setSelectedType] = useState("");
  const [triggers, setTriggers] = useState("");

  const symptomTypes = [
    "Fatigue", "Pain", "Headache", "Nausea", "Dizziness",
    "Swelling", "Rash", "Fever", "Brain fog", "Numbness",
  ];
  const symptomTypesZh = [
    "疲劳", "疼痛", "头痛", "恶心", "头晕",
    "肿胀", "皮疹", "发热", "脑雾", "麻木",
  ];
  const types = lang === "zh" ? symptomTypesZh : symptomTypes;

  return (
    <div>
      <h3 className="text-lg font-semibold text-[#2d4a2d] mb-3 text-center">{t("symptom.log")}</h3>
      <div className="bg-white/50 rounded-2xl p-5 space-y-4">
        <div>
          <p className="text-sm font-medium text-[#2d4a2d] mb-2">{t("symptom.type")}</p>
          <div className="flex flex-wrap gap-1.5">
            {types.map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-3 py-1.5 rounded-full text-xs cursor-pointer transition-all ${
                  selectedType === type ? "bg-[#4a7a4a] text-white" : "bg-white/60 text-[#3d5a3d] hover:bg-white/80"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex justify-between mb-1">
            <p className="text-sm font-medium text-[#2d4a2d]">{t("symptom.severity")}</p>
            <p className="text-xs text-[#6a8a6a]">
              {severity === 1 ? t("symptom.mild") : severity === 2 ? t("symptom.moderate") : t("symptom.severe")}
            </p>
          </div>
          <div className="flex gap-2">
            {[1, 2, 3].map((v) => (
              <button
                key={v}
                onClick={() => setSeverity(v)}
                className={`flex-1 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all ${
                  severity === v ? "bg-[#4a7a4a] text-white" : "bg-white/60 text-[#3d5a3d]"
                }`}
              >
                {v === 1 ? t("symptom.mild") : v === 2 ? t("symptom.moderate") : t("symptom.severe")}
              </button>
            ))}
          </div>
        </div>

        <input
          type="text"
          value={triggers}
          onChange={(e) => setTriggers(e.target.value)}
          placeholder={t("symptom.triggers")}
          className="w-full px-3 py-2 rounded-xl bg-white/60 border border-[#c0d8c0] text-[#2d4a2d] text-xs focus:outline-none focus:ring-2 focus:ring-[#a0c8a0]"
        />

        <button className="w-full py-2.5 rounded-full text-sm font-medium bg-[#4a7a4a] text-white cursor-pointer disabled:opacity-40">
          {t("symptom.log")}
        </button>
      </div>
    </div>
  );
}

function BloodSugarTracker() {
  const { t } = useI18n();
  const [value, setValue] = useState("");
  const [context, setContext] = useState("fasting");

  const contexts = [
    { id: "fasting", label: t("sugar.fasting") },
    { id: "beforeMeal", label: t("sugar.beforeMeal") },
    { id: "afterMeal", label: t("sugar.afterMeal") },
    { id: "bedtime", label: t("sugar.bedtime") },
  ];

  return (
    <div>
      <h3 className="text-lg font-semibold text-[#2d4a2d] mb-3 text-center">{t("sugar.title")}</h3>
      <div className="bg-white/50 rounded-2xl p-5 space-y-4">
        <div>
          <p className="text-sm font-medium text-[#2d4a2d] mb-2">{t("sugar.value")}</p>
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="120"
            className="w-full px-3 py-2 rounded-xl bg-white/60 border border-[#c0d8c0] text-[#2d4a2d] text-lg font-semibold text-center focus:outline-none focus:ring-2 focus:ring-[#a0c8a0]"
          />
        </div>

        <div>
          <p className="text-sm font-medium text-[#2d4a2d] mb-2">{t("sugar.context")}</p>
          <div className="flex flex-wrap gap-1.5">
            {contexts.map((c) => (
              <button
                key={c.id}
                onClick={() => setContext(c.id)}
                className={`px-3 py-1.5 rounded-full text-xs cursor-pointer transition-all ${
                  context === c.id ? "bg-[#4a7a4a] text-white" : "bg-white/60 text-[#3d5a3d] hover:bg-white/80"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <button className="w-full py-2.5 rounded-full text-sm font-medium bg-[#4a7a4a] text-white cursor-pointer disabled:opacity-40">
          {t("sugar.log")}
        </button>
      </div>
    </div>
  );
}

function WomensHealthTracker() {
  const { t } = useI18n();
  const [selected, setSelected] = useState<string[]>([]);

  const symptoms = [
    { key: "womens.hotFlash", icon: "🔥" },
    { key: "womens.nightSweat", icon: "💧" },
    { key: "womens.brainFog", icon: "🌫️" },
    { key: "womens.jointPain", icon: "🦴" },
    { key: "womens.moodSwing", icon: "🎭" },
    { key: "womens.insomnia", icon: "😴" },
    { key: "womens.fatigue", icon: "🔋" },
    { key: "womens.anxiety", icon: "😰" },
    { key: "womens.cycle", icon: "🌸" },
    { key: "womens.headache", icon: "🤕" },
  ];

  const toggle = (key: string) => {
    setSelected((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
  };

  return (
    <div>
      <h3 className="text-lg font-semibold text-[#2d4a2d] mb-3 text-center">{t("condition.womens")}</h3>
      <div className="bg-white/50 rounded-2xl p-5">
        <p className="text-xs text-[#6a8a6a] mb-3 text-center">{t("symptom.log")}</p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {symptoms.map((s) => (
            <button
              key={s.key}
              onClick={() => toggle(s.key)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs cursor-pointer transition-all ${
                selected.includes(s.key) ? "bg-[#4a7a4a] text-white" : "bg-white/60 text-[#3d5a3d] hover:bg-white/80"
              }`}
            >
              <span>{s.icon}</span>
              <span>{t(s.key)}</span>
            </button>
          ))}
        </div>

        <button disabled={selected.length === 0} className="w-full py-2.5 rounded-full text-sm font-medium bg-[#4a7a4a] text-white cursor-pointer disabled:opacity-40">
          {t("symptom.log")}
        </button>
      </div>
    </div>
  );
}
