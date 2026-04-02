"use client";

import { useState, useEffect } from "react";
import { I18nProvider, useI18n } from "@/lib/i18n";
import DailyCheckin from "./components/DailyCheckin";
import TrackTab from "./components/TrackTab";
import MedsTab from "./components/MedsTab";
import InsightsTab from "./components/InsightsTab";
import AuthButton from "./components/AuthButton";
import LangSwitcher from "./components/LangSwitcher";

type Tab = "today" | "track" | "meds" | "insights";

const tabKeys: { id: Tab; labelKey: string; icon: string }[] = [
  { id: "today", labelKey: "tab.today", icon: "📊" },
  { id: "track", labelKey: "tab.track", icon: "🩸" },
  { id: "meds", labelKey: "tab.meds", icon: "💊" },
  { id: "insights", labelKey: "tab.insights", icon: "📋" },
];

function AppContent() {
  const [activeTab, setActiveTab] = useState<Tab>("today");
  const { t } = useI18n();

  const [greeting, setGreeting] = useState("");
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting(t("greeting.morning"));
    else if (hour < 17) setGreeting(t("greeting.afternoon"));
    else setGreeting(t("greeting.evening"));
  }, [t]);

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-56 md:fixed md:inset-y-0 bg-white/60 backdrop-blur-md border-r border-[#d0e0cc]">
        <div className="p-6">
          <h1 className="text-lg font-bold text-[#2d4a2d]">Health</h1>
          <p className="text-xs text-[#6a8a6a]">Your Body, Understood</p>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {tabKeys.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${
                activeTab === tab.id
                  ? "bg-[#4a7a4a] text-white font-medium"
                  : "text-[#3d5a3d] hover:bg-white/60"
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              <span>{t(tab.labelKey)}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-[#d0e0cc] space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <LangSwitcher />
          </div>
          <AuthButton />
        </div>
      </aside>

      {/* Mobile header */}
      <header className="flex items-center justify-between px-4 pt-3 pb-1 md:hidden">
        <div className="flex items-center gap-2">
          <LangSwitcher />
        </div>
        <AuthButton />
      </header>

      {/* Main content */}
      <div className="flex-1 flex flex-col md:ml-56">
        <header className="hidden md:flex items-center justify-between px-8 py-4 border-b border-[#d0e0cc]/50">
          <div />
          <AuthButton />
        </header>

        {activeTab === "today" && (
          <div className="text-center py-4 px-4 md:py-8">
            <h1 className="text-2xl md:text-3xl font-bold text-[#2d4a2d]">{greeting}</h1>
          </div>
        )}

        <main className="flex-1 pb-24 md:pb-8 overflow-y-auto" key={activeTab}>
          <div className="md:max-w-2xl md:mx-auto md:px-8">
            {activeTab === "today" && <DailyCheckin />}
            {activeTab === "track" && <TrackTab />}
            {activeTab === "meds" && <MedsTab />}
            {activeTab === "insights" && <InsightsTab />}
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-[#d0e0cc] safe-bottom md:hidden">
        <div className="flex justify-around items-center h-16 max-w-md mx-auto">
          {tabKeys.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all cursor-pointer ${
                activeTab === tab.id ? "text-[#4a7a4a]" : "text-[#a0b8a0]"
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="text-xs font-medium">{t(tab.labelKey)}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

export default function Home() {
  return (
    <I18nProvider>
      <AppContent />
    </I18nProvider>
  );
}
