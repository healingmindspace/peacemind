"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase";
import { ADMIN_EMAIL } from "@/lib/admin";
import AppGrid from "./components/AppGrid";
import InsightPanel from "./components/InsightPanel";
import AccountBar from "./components/AccountBar";
import AdminDashboard from "./components/admin/AdminDashboard";

type Section = "apps" | "insights" | "discover" | "admin";

export default function Console() {
  const [activeSection, setActiveSection] = useState<Section>("apps");
  const [isAdmin, setIsAdmin] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsAdmin(user?.email === ADMIN_EMAIL);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAdmin(session?.user?.email === ADMIN_EMAIL);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  const tabs: { id: Section; label: string }[] = [
    { id: "apps", label: "My Apps" },
    { id: "insights", label: "Insights" },
    { id: "discover", label: "Discover" },
    ...(isAdmin ? [{ id: "admin" as Section, label: "Admin" }] : []),
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="px-6 py-5 flex items-center justify-between max-w-4xl mx-auto">
        <div>
          <h1 className="text-xl font-bold text-pm-text">Peacemind</h1>
          <p className="text-xs text-pm-text-tertiary">Your life, understood</p>
        </div>
        <AccountBar />
      </header>

      {/* Navigation */}
      <nav className="px-6 max-w-4xl mx-auto mb-6">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all cursor-pointer ${
                activeSection === tab.id
                  ? "bg-pm-text text-white"
                  : "text-pm-text-secondary hover:bg-pm-surface-active"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="px-6 pb-12 max-w-4xl mx-auto">
        {activeSection === "apps" && <AppGrid />}
        {activeSection === "insights" && <InsightPanel />}
        {activeSection === "discover" && <DiscoverSection />}
        {activeSection === "admin" && isAdmin && <AdminDashboard />}
      </main>
    </div>
  );
}

function DiscoverSection() {
  const upcomingApps = [
    { id: "money", name: "Money", icon: "💰", description: "Financial wellness — investing as lifelong learning", status: "coming-soon" as const },
    { id: "rest", name: "Rest", icon: "🌙", description: "Sleep tracking and recovery insights", status: "planned" as const },
    { id: "move", name: "Move", icon: "🏃", description: "Fitness and movement with gentle goals", status: "planned" as const },
    { id: "connect", name: "Connect", icon: "🤝", description: "Relationships and social wellness", status: "planned" as const },
    { id: "grow", name: "Grow", icon: "📚", description: "Learning and career development", status: "planned" as const },
  ];

  return (
    <div>
      <h2 className="text-sm font-semibold text-pm-text mb-4">Coming Soon</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {upcomingApps.map((app) => (
          <div
            key={app.id}
            className="bg-pm-surface rounded-2xl p-4 border border-pm-border"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{app.icon}</span>
              <div>
                <h3 className="text-sm font-semibold text-pm-text">{app.name}</h3>
                <span className="text-[10px] text-pm-text-muted uppercase tracking-wide">
                  {app.status === "coming-soon" ? "Coming soon" : "Planned"}
                </span>
              </div>
            </div>
            <p className="text-xs text-pm-text-tertiary">{app.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
