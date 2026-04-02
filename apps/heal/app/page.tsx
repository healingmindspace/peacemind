"use client";

import { useState, useEffect } from "react";
import { I18nProvider, useI18n } from "@/lib/i18n";
import { AuthProvider } from "@/lib/auth-context";
import HeroSection from "./components/HeroSection";
import AuthButton from "./components/AuthButton";
import { MoodTracker } from "@peacemind/plugin-mood";
import CalmTab from "./components/CalmTab";
import GoalsTab from "./components/GoalsTab";
import CrisisResources from "./components/CrisisResources";
import CommunityCounter from "./components/CommunityCounter";
import SummaryTab from "./components/SummaryTab";
import LangSwitcher from "./components/LangSwitcher";
import ClaimBanner from "./components/ClaimBanner";

type Tab = "mood" | "calm" | "goals" | "summary";

const tabKeys: { id: Tab; labelKey: string; icon: string }[] = [
  { id: "mood", labelKey: "tab.mood", icon: "🌈" },
  { id: "calm", labelKey: "tab.calm", icon: "🍃" },
  { id: "goals", labelKey: "tab.goals", icon: "🌱" },
  { id: "summary", labelKey: "tab.me", icon: "✨" },
];

interface GrowIntent {
  trigger: string;
  moodLabel?: string;
  moodEmoji?: string;
  helped?: string | null;
  source: "mood-done" | "mood-history" | "journal-history";
}

function AppContent() {
  const [activeTab, setActiveTab] = useState<Tab>("mood");
  const [growIntent, setGrowIntent] = useState<GrowIntent | null>(null);
  const [suggestedAssessment, setSuggestedAssessment] = useState<"phq9" | "gad7" | null>(null);
  const { t } = useI18n();

  const handleNavigateToGrow = (intent: GrowIntent) => {
    setGrowIntent(intent);
    setActiveTab("goals");
  };

  const handleSuggestAssessment = (type: "phq9" | "gad7") => {
    setSuggestedAssessment(type);
    setActiveTab("calm");
  };

  const clearGrowIntent = () => setGrowIntent(null);

  const [buildInfo, setBuildInfo] = useState("");
  useEffect(() => {
    const sha = (process.env.NEXT_PUBLIC_COMMIT_SHA || "local").slice(0, 7);
    const time = process.env.NEXT_PUBLIC_BUILD_TIME
      ? new Date(process.env.NEXT_PUBLIC_BUILD_TIME).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
      : "local";
    setBuildInfo(`Build: ${sha} · ${time}`);
  }, []);

  useEffect(() => {
    fetch("/api/visit", { method: "POST" }).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fdf6f0] via-[#f0e6f6] to-[#e8dff0] flex flex-col md:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-56 md:min-h-screen bg-pm-surface-active backdrop-blur-md border-r border-pm-accent md:fixed md:left-0 md:top-0 md:bottom-0">
        <div className="p-5 border-b border-pm-accent">
          <h1 className="text-lg font-bold text-pm-text" title={buildInfo}>Heal</h1>
          <p className="text-xs text-pm-text-tertiary">A Moment of Calm</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {tabKeys.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer text-left ${
                activeTab === tab.id
                  ? "bg-brand text-white shadow-md"
                  : "text-pm-text-secondary hover:bg-pm-surface-active"
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              <span className="text-sm font-medium">{t(tab.labelKey)}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-pm-accent space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <a href="/about" className="text-xs text-pm-text-muted hover:text-brand">About</a>
            <a href="/privacy" className="text-xs text-pm-text-muted hover:text-brand">Privacy</a>
            <CrisisResources compact />
            <LangSwitcher />
          </div>
          <AuthButton />
        </div>
      </aside>

      {/* Mobile header */}
      <header className="flex items-center justify-between px-4 pt-3 pb-1 md:hidden">
        <div className="flex items-center gap-2">
          <CrisisResources compact />
          <LangSwitcher />
        </div>
        <AuthButton />
      </header>

      {/* Main content */}
      <div className="flex-1 flex flex-col md:ml-56">
        {/* Desktop header */}
        <header className="hidden md:flex items-center justify-between px-8 py-4 border-b border-pm-accent/50">
          <div />
          <AuthButton />
        </header>

        <ClaimBanner />

        {activeTab === "mood" && (
          <>
            <HeroSection />
            <CommunityCounter />
          </>
        )}

        {/* Tab content */}
        <main className="flex-1 pb-24 md:pb-8 overflow-y-auto" key={activeTab}>
          <div className="md:max-w-2xl md:mx-auto md:px-8">
            {activeTab === "mood" && <MoodTracker onNavigateToGrow={handleNavigateToGrow} onSuggestAssessment={handleSuggestAssessment} />}
            {activeTab === "calm" && <CalmTab suggestedAssessment={suggestedAssessment} />}
            {activeTab === "goals" && <GoalsTab growIntent={growIntent} onClearGrowIntent={clearGrowIntent} />}
            {activeTab === "summary" && <SummaryTab />}
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-pm-surface-hover backdrop-blur-md border-t border-pm-accent safe-bottom md:hidden">
        <div className="flex justify-around items-center h-16 max-w-md mx-auto">
          {tabKeys.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all cursor-pointer ${
                activeTab === tab.id
                  ? "text-brand"
                  : "text-pm-text-muted"
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
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </I18nProvider>
  );
}
