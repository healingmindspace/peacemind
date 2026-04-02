"use client";

import { useI18n } from "@/lib/i18n";

export default function LangSwitcher() {
  const { lang, setLang } = useI18n();

  return (
    <button
      onClick={() => setLang(lang === "en" ? "zh" : "en")}
      className="px-2 py-1 rounded-full text-xs text-pm-text-secondary bg-pm-surface hover:bg-pm-surface-active transition-colors cursor-pointer"
    >
      {lang === "en" ? "中文" : "EN"}
    </button>
  );
}
