"use client";

import { useI18n } from "@/lib/i18n";

export default function LangSwitcher() {
  const { lang, setLang } = useI18n();

  return (
    <button
      onClick={() => setLang(lang === "en" ? "zh" : "en")}
      className="text-xs text-[#6a8a6a] hover:text-[#4a7a4a] cursor-pointer transition-colors"
    >
      {lang === "en" ? "中文" : "EN"}
    </button>
  );
}
