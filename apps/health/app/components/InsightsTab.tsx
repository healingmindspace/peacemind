"use client";

import { useI18n } from "@/lib/i18n";

export default function InsightsTab() {
  const { t, lang } = useI18n();

  return (
    <section className="py-6 px-4">
      <div className="max-w-sm md:max-w-lg mx-auto">
        <h2 className="text-xl font-semibold text-pm-text mb-1 text-center">{t("insights.title")}</h2>
        <p className="text-sm text-pm-text-tertiary mb-6 text-center">{t("insights.subtitle")}</p>

        {/* Generate insight */}
        <button className="w-full bg-pm-surface rounded-2xl p-6 text-center cursor-pointer hover:bg-white/70 transition-all mb-4">
          <span className="text-2xl">✨</span>
          <p className="text-sm font-medium text-brand mt-1">{t("insights.generate")}</p>
          <p className="text-xs text-pm-text-tertiary">
            {lang === "zh" ? "AI 分析你的健康数据中的规律" : "AI analyzes patterns in your health data"}
          </p>
        </button>

        {/* Doctor visit prep */}
        <button className="w-full bg-pm-surface rounded-2xl p-6 text-center cursor-pointer hover:bg-white/70 transition-all">
          <span className="text-2xl">🩺</span>
          <p className="text-sm font-medium text-brand mt-1">{t("insights.doctorPrep")}</p>
          <p className="text-xs text-pm-text-tertiary">{t("insights.doctorPrepDesc")}</p>
        </button>
      </div>
    </section>
  );
}
