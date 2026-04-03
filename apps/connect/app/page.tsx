"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import CirclesList from "./components/CirclesList";
import CircleFeed from "./components/CircleFeed";
import FriendMessages from "./components/FriendMessages";

type Tab = "circles" | "friends";

export default function ConnectApp() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("circles");
  const [selectedCircle, setSelectedCircle] = useState<string | null>(null);
  const [buildInfo, setBuildInfo] = useState("");
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const sha = (process.env.NEXT_PUBLIC_COMMIT_SHA || "local").slice(0, 7);
    const time = process.env.NEXT_PUBLIC_BUILD_TIME
      ? new Date(process.env.NEXT_PUBLIC_BUILD_TIME).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
      : "local";
    setBuildInfo(`Build: ${sha} · ${time}`);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then((res) => setUser(res.data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  const signIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="px-6 py-5 flex items-center justify-between max-w-lg mx-auto">
        <div>
          <h1 className="text-xl font-bold text-pm-text" title={buildInfo}>Connect</h1>
          <p className="text-xs text-pm-text-tertiary">Safe connections, no identity</p>
        </div>
        {user ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-pm-text-muted">🤝</span>
            <button
              onClick={() => supabase.auth.signOut()}
              className="text-xs text-pm-text-muted hover:text-brand cursor-pointer"
            >
              Sign out
            </button>
          </div>
        ) : (
          <button
            onClick={signIn}
            className="px-4 py-2 rounded-full text-sm font-medium bg-brand text-white cursor-pointer"
          >
            Sign in
          </button>
        )}
      </header>

      {/* Tabs */}
      <nav className="px-6 max-w-lg mx-auto mb-4">
        <div className="flex gap-1">
          {([
            { id: "circles" as Tab, label: "Circles", icon: "🔵" },
            { id: "friends" as Tab, label: "Friends", icon: "🌱" },
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSelectedCircle(null); }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all cursor-pointer ${
                activeTab === tab.id
                  ? "bg-brand text-white"
                  : "text-pm-text-secondary hover:bg-pm-surface-active"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="px-6 pb-12 max-w-lg mx-auto">
        {activeTab === "circles" && !selectedCircle && (
          <CirclesList onSelectCircle={setSelectedCircle} />
        )}
        {activeTab === "circles" && selectedCircle && (
          <CircleFeed
            circle={selectedCircle}
            user={user}
            onBack={() => setSelectedCircle(null)}
          />
        )}
        {activeTab === "friends" && (
          <FriendMessages user={user} />
        )}
      </main>
    </div>
  );
}
