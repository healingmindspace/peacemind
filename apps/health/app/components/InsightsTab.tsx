"use client";

import { useI18n } from "@/lib/i18n";

export default function InsightsTab() {
  const { t, lang } = useI18n();

  return (
    <section className="py-6 px-4">
      <div className="max-w-sm md:max-w-lg mx-auto">
        <h2 className="text-xl font-semibold text-[#2d4a2d] mb-1 text-center">{t("insights.title")}</h2>
        <p className="text-sm text-[#6a8a6a] mb-6 text-center">{t("insights.subtitle")}</p>

        {/* Generate insight */}
        <button className="w-full bg-white/50 rounded-2xl p-6 text-center cursor-pointer hover:bg-white/70 transition-all mb-4">
          <span className="text-2xl">✨</span>
          <p className="text-sm font-medium text-[#4a7a4a] mt-1">{t("insights.generate")}</p>
          <p className="text-xs text-[#6a8a6a]">
            {lang === "zh" ? "AI 分析你的健康数据中的规律" : "AI analyzes patterns in your health data"}
          </p>
        </button>

        {/* Doctor visit prep */}
        <button className="w-full bg-white/50 rounded-2xl p-6 text-center cursor-pointer hover:bg-white/70 transition-all">
          <span className="text-2xl">🩺</span>
          <p className="text-sm font-medium text-[#4a7a4a] mt-1">{t("insights.doctorPrep")}</p>
          <p className="text-xs text-[#6a8a6a]">{t("insights.doctorPrepDesc")}</p>
        </button>
      </div>
    </section>
  );
}
