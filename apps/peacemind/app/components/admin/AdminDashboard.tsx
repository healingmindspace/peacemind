"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

import { ADMIN_EMAIL } from "@/lib/admin";

function BuildInfo() {
  const [text, setText] = useState("");
  useEffect(() => {
    const sha = (process.env.NEXT_PUBLIC_COMMIT_SHA || "local").slice(0, 7);
    const time = process.env.NEXT_PUBLIC_BUILD_TIME
      ? new Date(process.env.NEXT_PUBLIC_BUILD_TIME).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
      : "local";
    setText(`Build: ${sha} · ${time}`);
  }, []);
  return <p className="text-center text-[10px] text-[#b0a3c4] mt-8">{text}</p>;
}

const DAILY_VERSES = [
  { verse: "The Lord is close to the brokenhearted and saves those who are crushed in spirit.", ref: "Psalm 34:18" },
  { verse: "Come to me, all you who are weary and burdened, and I will give you rest.", ref: "Matthew 11:28" },
  { verse: "He heals the brokenhearted and binds up their wounds.", ref: "Psalm 147:3" },
  { verse: "The Lord is my shepherd, I lack nothing. He makes me lie down in green pastures, he leads me beside quiet waters, he refreshes my soul.", ref: "Psalm 23:1-3" },
  { verse: "Peace I leave with you; my peace I give you. I do not give to you as the world gives. Do not let your hearts be troubled and do not be afraid.", ref: "John 14:27" },
  { verse: "Cast all your anxiety on him because he cares for you.", ref: "1 Peter 5:7" },
  { verse: "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future.", ref: "Jeremiah 29:11" },
  { verse: "The Lord your God is with you, the Mighty Warrior who saves. He will take great delight in you; in his love he will no longer rebuke you, but will rejoice over you with singing.", ref: "Zephaniah 3:17" },
  { verse: "Even though I walk through the darkest valley, I will fear no evil, for you are with me; your rod and your staff, they comfort me.", ref: "Psalm 23:4" },
  { verse: "Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.", ref: "Joshua 1:9" },
  { verse: "The Lord is my light and my salvation — whom shall I fear?", ref: "Psalm 27:1" },
  { verse: "God is our refuge and strength, an ever-present help in trouble.", ref: "Psalm 46:1" },
  { verse: "I can do all this through him who gives me strength.", ref: "Philippians 4:13" },
  { verse: "But those who hope in the Lord will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint.", ref: "Isaiah 40:31" },
  { verse: "Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God. And the peace of God, which transcends all understanding, will guard your hearts and your minds.", ref: "Philippians 4:6-7" },
  { verse: "When you pass through the waters, I will be with you; and when you pass through the rivers, they will not sweep over you.", ref: "Isaiah 43:2" },
  { verse: "He gives strength to the weary and increases the power of the weak.", ref: "Isaiah 40:29" },
  { verse: "Blessed are those who mourn, for they will be comforted.", ref: "Matthew 5:4" },
  { verse: "The Lord is gracious and compassionate, slow to anger and rich in love.", ref: "Psalm 145:8" },
  { verse: "And we know that in all things God works for the good of those who love him.", ref: "Romans 8:28" },
  { verse: "So do not fear, for I am with you; do not be dismayed, for I am your God. I will strengthen you and help you.", ref: "Isaiah 41:10" },
  { verse: "Weeping may stay for the night, but rejoicing comes in the morning.", ref: "Psalm 30:5" },
  { verse: "The Lord himself goes before you and will be with you; he will never leave you nor forsake you. Do not be afraid; do not be discouraged.", ref: "Deuteronomy 31:8" },
  { verse: "My grace is sufficient for you, for my power is made perfect in weakness.", ref: "2 Corinthians 12:9" },
  { verse: "Trust in the Lord with all your heart and lean not on your own understanding.", ref: "Proverbs 3:5" },
  { verse: "The Lord is near to all who call on him, to all who call on him in truth.", ref: "Psalm 145:18" },
  { verse: "See, I am doing a new thing! Now it springs up; do you not perceive it?", ref: "Isaiah 43:19" },
  { verse: "Let the morning bring me word of your unfailing love, for I have put my trust in you.", ref: "Psalm 143:8" },
  { verse: "You are altogether beautiful, my darling; there is no flaw in you.", ref: "Song of Solomon 4:7" },
  { verse: "The steadfast love of the Lord never ceases; his mercies never come to an end; they are new every morning.", ref: "Lamentations 3:22-23" },
  { verse: "Be still, and know that I am God.", ref: "Psalm 46:10" },
];

function DailyVerse() {
  const [verse, setVerse] = useState<{ verse: string; ref: string } | null>(null);
  useEffect(() => {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    setVerse(DAILY_VERSES[dayOfYear % DAILY_VERSES.length]);
  }, []);

  if (!verse) return null;
  return (
    <div className="mt-8 bg-[#f0e6f6]/40 rounded-2xl p-5 text-center">
      <p className="text-sm text-[#5a4a7a] leading-relaxed italic">&ldquo;{verse.verse}&rdquo;</p>
      <p className="text-xs text-[#b0a3c4] mt-2">— {verse.ref} (NIV)</p>
    </div>
  );
}

interface DailyActive {
  day: string;
  users: number;
}

interface Stats {
  totalUsers: number;
  activeUsers7d: number;
  totalMoods: number;
  totalJournals: number;
  totalBreathing: number;
  dailyActive: DailyActive[];
  totalVisitors: number;
  visitorsToday: number;
  visitors7d: number;
  dailyVisitors: DailyActive[];
  ipBreakdown: { ip: string; totalVisits: number; lastSeen: string; device: string; country: string | null; region: string | null }[];
  locationBreakdown: { country: string; region: string | null; count: number }[];
  mobileCount: number;
  desktopCount: number;
  feedbackList: { id: string; subject: string | null; message: string; reply: string | null; user_id: string | null; user_email: string | null; created_at: string }[];
}

export default function AdminDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [adminTab, setAdminTab] = useState<"stats" | "feedback" | "info">("stats");
  const [feedbackFilter, setFeedbackFilter] = useState<"all" | "anonymous" | "authenticated" | "unreplied">("all");

  const supabase = createClient();

  const sendReply = async (feedbackId: string) => {
    if (!replyText.trim()) return;
    const session = await supabase.auth.getSession();
    const accessToken = session.data.session?.access_token;
    if (!accessToken) return;
    await fetch("https://heal.peacemind.app/api/feedback-reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken, feedbackId, reply: replyText.trim() }),
    });
    setReplyingTo(null);
    setReplyText("");
    loadStats();
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
      if (user?.email === ADMIN_EMAIL) loadStats();
    });
  }, []);

  const loadStats = async () => {
    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const [moods, journals, breathing, recentMoods, recentJournals, recentBreathing, dailyMoods, allVisits, todayVisits, weekVisits, allVisitRows] =
      await Promise.all([
        supabase.from("moods").select("id", { count: "exact", head: true }),
        supabase.from("journals").select("id", { count: "exact", head: true }),
        supabase.from("breathing_sessions").select("id", { count: "exact", head: true }),
        supabase
          .from("moods")
          .select("user_id")
          .gte("created_at", sevenDaysAgo.toISOString()),
        supabase
          .from("journals")
          .select("user_id")
          .gte("created_at", sevenDaysAgo.toISOString()),
        supabase
          .from("breathing_sessions")
          .select("user_id")
          .gte("created_at", sevenDaysAgo.toISOString()),
        supabase
          .from("moods")
          .select("user_id, created_at")
          .gte("created_at", thirtyDaysAgo.toISOString())
          .order("created_at", { ascending: true }),
        supabase.from("visits").select("ip", { count: "exact", head: true }),
        supabase.from("visits").select("ip").eq("date", now.toISOString().split("T")[0]),
        supabase.from("visits").select("ip, date").gte("date", sevenDaysAgo.toISOString().split("T")[0]),
        supabase.from("visits").select("ip, count, date, device, country, region").order("date", { ascending: false }).limit(500),
      ]);

    const { data: feedbackData } = await supabase
      .from("feedback")
      .select("id, subject, message, reply, user_id, user_email, created_at")
      .order("created_at", { ascending: false })
      .limit(20);

    // Count unique active users in last 7 days
    const activeSet = new Set<string>();
    recentMoods.data?.forEach((m) => activeSet.add(m.user_id));
    recentJournals.data?.forEach((j) => activeSet.add(j.user_id));
    recentBreathing.data?.forEach((b) => activeSet.add(b.user_id));

    // Count unique users per day (from moods as proxy)
    const dayMap = new Map<string, Set<string>>();
    dailyMoods.data?.forEach((m) => {
      const day = new Date(m.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      if (!dayMap.has(day)) dayMap.set(day, new Set());
      dayMap.get(day)!.add(m.user_id);
    });

    const dailyActive: DailyActive[] = Array.from(dayMap.entries()).map(
      ([day, users]) => ({ day, users: users.size })
    );

    // Total users — count unique user_ids across all tables
    const allUsers = new Set<string>();
    recentMoods.data?.forEach((m) => allUsers.add(m.user_id));
    recentJournals.data?.forEach((j) => allUsers.add(j.user_id));
    recentBreathing.data?.forEach((b) => allUsers.add(b.user_id));

    // For total users, we query all moods/journals to get unique users
    const [allMoodUsers, allJournalUsers] = await Promise.all([
      supabase.from("moods").select("user_id"),
      supabase.from("journals").select("user_id"),
    ]);
    const totalSet = new Set<string>();
    allMoodUsers.data?.forEach((m) => totalSet.add(m.user_id));
    allJournalUsers.data?.forEach((j) => totalSet.add(j.user_id));

    // Visitor stats
    const todayUniqueIps = new Set(todayVisits.data?.map((v) => v.ip) || []);
    const weekIpsByDay = new Map<string, Set<string>>();
    weekVisits.data?.forEach((v) => {
      if (!weekIpsByDay.has(v.date)) weekIpsByDay.set(v.date, new Set());
      weekIpsByDay.get(v.date)!.add(v.ip);
    });
    const dailyVisitors: DailyActive[] = Array.from(weekIpsByDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, ips]) => ({
        day: new Date(date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        users: ips.size,
      }));

    // IP breakdown
    const ipMap = new Map<string, { totalVisits: number; lastSeen: string; device: string; country: string | null; region: string | null }>();
    let mobileCount = 0;
    let desktopCount = 0;
    allVisitRows.data?.forEach((v) => {
      const existing = ipMap.get(v.ip);
      const visits = v.count || 1;
      if (v.device === "mobile") mobileCount++;
      else desktopCount++;
      if (existing) {
        existing.totalVisits += visits;
        if (v.date > existing.lastSeen) existing.lastSeen = v.date;
        if (v.country && !existing.country) { existing.country = v.country; existing.region = v.region; }
      } else {
        ipMap.set(v.ip, { totalVisits: visits, lastSeen: v.date, device: v.device || "?", country: v.country || null, region: v.region || null });
      }
    });
    const ipBreakdown = Array.from(ipMap.entries())
      .map(([ip, data]) => ({ ip, ...data }))
      .sort((a, b) => b.totalVisits - a.totalVisits);

    // Location breakdown
    const locMap = new Map<string, { country: string; region: string | null; count: number }>();
    allVisitRows.data?.forEach((v) => {
      if (!v.country) return;
      const key = `${v.country}|${v.region || ""}`;
      const existing = locMap.get(key);
      if (existing) { existing.count++; }
      else { locMap.set(key, { country: v.country, region: v.region || null, count: 1 }); }
    });
    const locationBreakdown = Array.from(locMap.values()).sort((a, b) => b.count - a.count);

    setStats({
      totalUsers: totalSet.size,
      activeUsers7d: activeSet.size,
      totalMoods: moods.count || 0,
      totalJournals: journals.count || 0,
      totalBreathing: breathing.count || 0,
      dailyActive,
      totalVisitors: allVisits.count || 0,
      visitorsToday: todayUniqueIps.size,
      visitors7d: new Set(weekVisits.data?.map((v) => v.ip) || []).size,
      dailyVisitors,
      ipBreakdown,
      locationBreakdown,
      mobileCount,
      desktopCount,
      feedbackList: feedbackData || [],
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#fdf6f0] via-[#f0e6f6] to-[#e8dff0] flex items-center justify-center">
        <p className="text-sm text-[#8a7da0]">Loading...</p>
      </div>
    );
  }

  if (!user || user.email !== ADMIN_EMAIL) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#fdf6f0] via-[#f0e6f6] to-[#e8dff0] flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl mb-2">🔒</p>
          <p className="text-sm text-[#5a4a7a]">Admin access only</p>
          <a href="/" className="text-xs text-[#b0a3c4] mt-2 block">← Back to app</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fdf6f0] via-[#f0e6f6] to-[#e8dff0] p-6">
      <div className="max-w-lg md:max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-[#3d3155]">Admin Dashboard</h1>
          <a href="/" className="text-xs text-[#b0a3c4] hover:text-[#7c6a9e]">← Back</a>
        </div>

        {/* Admin tab menu */}
        <div className="flex gap-2 mb-6">
          {(["stats", "feedback", "info"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setAdminTab(tab)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-all ${
                adminTab === tab
                  ? "bg-[#7c6a9e] text-white"
                  : "bg-white/50 text-[#5a4a7a] hover:bg-white/70"
              }`}
            >
              {tab === "stats" ? "📊 Stats" : tab === "feedback" ? "💬 Feedback" : "⚙️ Info"}
            </button>
          ))}
        </div>

        {stats ? (
          <>
            {/* === STATS TAB === */}
            {adminTab === "stats" && <>
            {/* Key metrics */}
            <div className="grid grid-cols-2 gap-3 mb-8">
              <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-4 text-center">
                <p className="text-3xl font-bold text-[#3d3155]">{stats.totalUsers}</p>
                <p className="text-xs text-[#8a7da0] mt-1">Total Users</p>
              </div>
              <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-4 text-center">
                <p className="text-3xl font-bold text-[#3d3155]">{stats.activeUsers7d}</p>
                <p className="text-xs text-[#8a7da0] mt-1">Active (7 days)</p>
              </div>
              <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-4 text-center">
                <p className="text-3xl font-bold text-[#3d3155]">{stats.totalMoods}</p>
                <p className="text-xs text-[#8a7da0] mt-1">Total Moods</p>
              </div>
              <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-4 text-center">
                <p className="text-3xl font-bold text-[#3d3155]">{stats.totalJournals}</p>
                <p className="text-xs text-[#8a7da0] mt-1">Total Journals</p>
              </div>
              <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-4 text-center col-span-2">
                <p className="text-3xl font-bold text-[#3d3155]">{stats.totalBreathing}</p>
                <p className="text-xs text-[#8a7da0] mt-1">Breathing Sessions</p>
              </div>
            </div>

            {/* Visitor metrics */}
            <h2 className="text-sm font-semibold text-[#3d3155] mb-3">Visitors (by IP)</h2>
            <div className="grid grid-cols-3 gap-3 mb-8">
              <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-4 text-center">
                <p className="text-2xl font-bold text-[#3d3155]">{stats.visitorsToday}</p>
                <p className="text-xs text-[#8a7da0] mt-1">Today</p>
              </div>
              <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-4 text-center">
                <p className="text-2xl font-bold text-[#3d3155]">{stats.visitors7d}</p>
                <p className="text-xs text-[#8a7da0] mt-1">7 days</p>
              </div>
              <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-4 text-center">
                <p className="text-2xl font-bold text-[#3d3155]">{stats.totalVisitors}</p>
                <p className="text-xs text-[#8a7da0] mt-1">All time</p>
              </div>
            </div>

            {/* Daily visitors chart */}
            {stats.dailyVisitors.length > 0 && (
              <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-4 mb-8">
                <h2 className="text-sm font-semibold text-[#3d3155] mb-4">
                  Daily Visitors (7 days)
                </h2>
                <div className="space-y-1">
                  {stats.dailyVisitors.map((d) => (
                    <div key={d.day} className="flex items-center gap-3">
                      <span className="text-xs text-[#8a7da0] w-16">{d.day}</span>
                      <div className="flex-1 bg-[#e8dff0] rounded-full h-4 overflow-hidden">
                        <div
                          className="bg-[#c4b5e0] h-full rounded-full"
                          style={{
                            width: `${Math.min(100, (d.users / Math.max(...stats.dailyVisitors.map((x) => x.users))) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-[#3d3155] font-medium w-6 text-right">
                        {d.users}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Daily active users */}
            <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-4">
              <h2 className="text-sm font-semibold text-[#3d3155] mb-4">
                Daily Active Users (30 days)
              </h2>
              {stats.dailyActive.length > 0 ? (
                <div className="space-y-1">
                  {stats.dailyActive.map((d) => (
                    <div key={d.day} className="flex items-center gap-3">
                      <span className="text-xs text-[#8a7da0] w-16">{d.day}</span>
                      <div className="flex-1 bg-[#e8dff0] rounded-full h-4 overflow-hidden">
                        <div
                          className="bg-[#7c6a9e] h-full rounded-full"
                          style={{
                            width: `${Math.min(100, (d.users / Math.max(...stats.dailyActive.map((x) => x.users))) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-[#3d3155] font-medium w-6 text-right">
                        {d.users}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#8a7da0] text-center">No data yet</p>
              )}
            </div>

            {/* Device breakdown */}
            <div className="grid grid-cols-2 gap-3 mt-8 mb-4">
              <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-3 text-center">
                <p className="text-2xl font-bold text-[#3d3155]">📱 {stats.mobileCount}</p>
                <p className="text-xs text-[#8a7da0] mt-1">Mobile</p>
              </div>
              <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-3 text-center">
                <p className="text-2xl font-bold text-[#3d3155]">🖥 {stats.desktopCount}</p>
                <p className="text-xs text-[#8a7da0] mt-1">Desktop</p>
              </div>
            </div>

            {/* Location Breakdown */}
            {stats.locationBreakdown.length > 0 && (
              <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-4 mb-4">
                <h2 className="text-sm font-semibold text-[#3d3155] mb-3">
                  🌍 Visitor Locations ({stats.locationBreakdown.length})
                </h2>
                <div className="space-y-1.5">
                  {stats.locationBreakdown.map((loc) => (
                    <div key={`${loc.country}-${loc.region}`} className="flex items-center gap-2">
                      <span className="text-xs w-6 text-center">{loc.country === "US" ? "🇺🇸" : loc.country === "CN" ? "🇨🇳" : "🌐"}</span>
                      <span className="text-xs text-[#5a4a7a] flex-1 truncate">
                        {loc.country}{loc.region ? `, ${loc.region}` : ""}
                      </span>
                      <div className="w-24 bg-[#e8dff0] rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-[#7c6a9e] h-full rounded-full"
                          style={{ width: `${Math.min(100, (loc.count / Math.max(...stats.locationBreakdown.map((l) => l.count))) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-[#3d3155] font-medium w-6 text-right">{loc.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* IP Breakdown */}
            {stats.ipBreakdown.length > 0 && (
              <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-4">
                <h2 className="text-sm font-semibold text-[#3d3155] mb-4">
                  Real Visitors ({stats.ipBreakdown.length})
                </h2>
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {stats.ipBreakdown.map((item) => (
                    <div key={item.ip} className="flex items-center gap-3" title={item.country ? `${item.country}${item.region ? `, ${item.region}` : ""}` : ""}>
                      <span className="text-xs">{item.device === "mobile" ? "📱" : "🖥"}</span>
                      <span className="text-xs text-[#8a7da0] font-mono w-24 truncate">{item.ip}</span>
                      <span className="text-[10px] text-[#7c6a9e] w-14 truncate" title={item.country && item.region ? `${item.country}, ${item.region}` : ""}>
                        {item.country ? `${item.country === "US" ? "🇺🇸" : item.country === "CN" ? "🇨🇳" : "🌐"} ${item.country}` : ""}
                      </span>
                      <div className="flex-1 bg-[#e8dff0] rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-[#c4b5e0] h-full rounded-full"
                          style={{
                            width: `${Math.min(100, (item.totalVisits / Math.max(...stats.ipBreakdown.map((x) => x.totalVisits))) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-[#3d3155] font-medium w-8 text-right">
                        {item.totalVisits}
                      </span>
                      <span className="text-xs text-[#b0a3c4] w-16 text-right">
                        {item.lastSeen}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            </>}

            {/* === FEEDBACK TAB === */}
            {adminTab === "feedback" && <>
            {/* Feedback */}
            {stats.feedbackList.length > 0 && (() => {
              const anonCount = stats.feedbackList.filter((fb) => !fb.user_id).length;
              const authCount = stats.feedbackList.filter((fb) => fb.user_id).length;
              const unrepliedCount = stats.feedbackList.filter((fb) => !fb.reply).length;
              const filtered = feedbackFilter === "all" ? stats.feedbackList
                : feedbackFilter === "anonymous" ? stats.feedbackList.filter((fb) => !fb.user_id)
                : feedbackFilter === "unreplied" ? stats.feedbackList.filter((fb) => !fb.reply)
                : stats.feedbackList.filter((fb) => fb.user_id);
              return (
              <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-4 mt-8">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-[#3d3155]">
                    User Feedback ({stats.feedbackList.length})
                  </h2>
                </div>
                <div className="flex gap-1 mb-3">
                  {([["all", `All (${stats.feedbackList.length})`], ["unreplied", `Unreplied (${unrepliedCount})`], ["anonymous", `Anonymous (${anonCount})`], ["authenticated", `Users (${authCount})`]] as const).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setFeedbackFilter(key)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                        feedbackFilter === key
                          ? "bg-[#7c6a9e] text-white"
                          : "bg-white/50 text-[#5a4a7a] hover:bg-white/70"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filtered.map((fb) => (
                    <div key={fb.id} className="bg-white/40 rounded-xl p-3">
                      {fb.subject && (
                        <p className="text-xs font-semibold text-[#7c6a9e] mb-1">{fb.subject}</p>
                      )}
                      <p className="text-sm text-[#3d3155]">{fb.message}</p>
                      <div className="flex justify-between items-center mt-1 flex-wrap gap-1">
                        <span className="text-xs text-[#b0a3c4]">
                          {fb.user_email || (fb.user_id ? fb.user_id.slice(0, 8) + "..." : "anonymous")}
                        </span>
                        <span className="text-xs text-[#b0a3c4] font-mono">
                          #{fb.id.slice(0, 8)}
                        </span>
                        <span className="text-xs text-[#b0a3c4]">
                          {new Date(fb.created_at).toLocaleDateString("en-US", {
                            month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                          })}
                        </span>
                      </div>

                      {/* Existing reply */}
                      {fb.reply && (
                        <div className="mt-2 pl-3 border-l-2 border-[#c4b5e0]">
                          <p className="text-xs text-[#5a4a7a]">↩ {fb.reply}</p>
                        </div>
                      )}

                      {/* Reply input */}
                      {replyingTo === fb.id ? (
                        <div className="mt-2">
                          <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            rows={2}
                            placeholder="Write a reply..."
                            className="w-full px-3 py-2 rounded-lg bg-white/60 border border-[#d8cfe8] text-[#3d3155] text-xs placeholder-[#b0a3c4] focus:outline-none focus:ring-2 focus:ring-[#c4b5e0] resize-none mb-1"
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => sendReply(fb.id)}
                              className="text-xs px-3 py-1 rounded-full bg-[#7c6a9e] text-white cursor-pointer"
                            >
                              Send
                            </button>
                            <button
                              onClick={() => { setReplyingTo(null); setReplyText(""); }}
                              className="text-xs px-3 py-1 rounded-full bg-white/60 text-[#5a4a7a] cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setReplyingTo(fb.id); setReplyText(fb.reply || ""); }}
                          className="mt-1 text-xs text-[#b0a3c4] hover:text-[#7c6a9e] cursor-pointer"
                        >
                          {fb.reply ? "Edit reply" : "Reply"}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              );
            })()}

            </>}

            {/* === INFO TAB === */}
            {adminTab === "info" && <>
            {/* Progress Timeline */}
            <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-4 mt-8">
              <h2 className="text-sm font-semibold text-[#3d3155] mb-4">
                Development Timeline
              </h2>
              <div className="space-y-3 text-xs text-[#5a4a7a] border-l-2 border-[#c4b5e0] pl-4">
                <div>
                  <p className="font-semibold text-[#3d3155]">Apr 4–5 — Seeds Fix, Photo Overhaul, Pagination, Tests, AI Planner</p>
                  <p>🌱 Seeds: DB is now source of truth for authenticated users — fixed cross-browser count drift. Server-first award/deduct, loadSeedsFromServer on init. 📷 Photo: removed camera from mood &amp; journal (kept upload in journal). Text extraction now opt-in (Extract text button). Photos resized before upload (1200px) to stay under Vercel limit. Signed URLs extended to 24h with batch API. Broken thumbnails hidden gracefully. 📝 Journal: pagination (10/page with Load more). Content capped at 5000 chars with counter. Clear text button. Photo upload resilient to failures. 😊 Mood: removed AI response, removed photo. Pagination (10/page). Plugin MoodTracker synced with app version. ✨ AI Planner: max_tokens 300→1024. Date-specific objectives create dated tasks. Steps editable before accepting (title, description, remove). Better error messages (truncated, rate limit). Dates in step titles. 🧪 Tests: 30 new tests (journal 6, seeds 15, invite 9). Fixed auth mocks in all existing tests. 70/71 passing. 🔧 Tech: chunked base64 conversion (fixed crash for large files), error logging on AI endpoints.</p>
                </div>
                <div>
                  <p className="font-semibold text-[#3d3155]">Apr 1 — Major Feature Day</p>
                  <p>🌿 5-4-3-2-1 grounding exercise. 🧠 PHQ-9/GAD-7 self-assessment (free, no login needed) with wellness nudge. 📅 Decoupled from Google Calendar — built-in scheduling. Custom mood tags (DB-backed, deletable). Crisis resources: China + international. &quot;Emotions Are Normal&quot; + &quot;Daily Habits&quot; learn topics. Healer Insight integrates assessment scores. Path achieve/archive. Review on-demand. 🏗️ API-first architecture: AuthProvider + useAuth(), /api/photos route, removed direct Supabase from 10+ components.</p>
                </div>
                <div>
                  <p className="font-semibold text-[#3d3155]">Mar 31 — Security Hardening + Code Cleanup</p>
                  <p>🔒 Encryption key throws on missing (no zero fallback). Server-side user ownership verification on all 9 API routes. Input validation (MAX_LENGTHS) on all routes. Centralized rate limiting (lib/rate-limit.ts) — replaced 7 duplicates, added to 9 unprotected routes. 🧹 Split GoalsTab (1355→715), MoodTracker (773→639), GratitudeJournal (609→435) into sub-components. 📅 Explicit date detection (4/1, April 1, Apr 1 2026), timezone fix for date display, one-tap add-to-calendar on paths. Tests with vitest.</p>
                </div>
                <div>
                  <p className="font-semibold text-[#3d3155]">Mar 30 — Grow Tab + Calm + Healer</p>
                  <p>🌱 Grow tab with paths, steps, journal (photo AI extraction), weekly calendar, AI planning (Healer), weekly review. 🍃 Combined Breathe + Relax into Calm tab. 4 tabs: Mood, Calm, Grow, Me. Server-side API for all DB access. Encrypted moods, journals, goals, tasks. Photo storage in Supabase. Smart schedule parsing from natural language. Renamed AI → Healer.</p>
                </div>
                <div>
                  <p className="font-semibold text-[#3d3155]">Mar 29 — GitHub + CI/CD Pipeline</p>
                  <p>Private GitHub repo (healingmindspace/heal-app), branch strategy (main → production, dev → preview, feature/* → PR previews), Vercel auto-deploy connected, git identity configured per project</p>
                </div>
                <div>
                  <p className="font-semibold text-[#3d3155]">Mar 29 — Smart Mood + Encryption</p>
                  <p>AI mood responses with history context, event triggers + coping tools, pattern detection, AES-256 journal encryption, backfill past days, responsive desktop layout, suggested Spotify playlists, feedback form, What&apos;s New section</p>
                </div>
                <div>
                  <p className="font-semibold text-[#3d3155]">Mar 28 — Relax Room + Spotify + Privacy</p>
                  <p>Photo gallery with custom categories, user photo uploads, Spotify OAuth + embed + playlist history with names, privacy policy, rate limiting, input sanitization, base64 encoding, visitor tracking with bot filtering</p>
                </div>
                <div>
                  <p className="font-semibold text-[#3d3155]">Mar 27 — Core Features + AI</p>
                  <p>Mood tracking with chart (week/month/quarter), breathing exercises (3 methods), journal with Claude AI responses + like, daily summary tab, PWA, Google OAuth, Supabase auth + DB, bilingual (EN/ZH), mobile-first design with bottom tabs, custom domain heal.peacemind.app</p>
                </div>
                <div>
                  <p className="font-semibold text-[#3d3155]">Mar 26 — Project Created</p>
                  <p>Next.js 16 scaffolded, deployed to Vercel, initial happy landing page</p>
                </div>
              </div>
            </div>

            {/* Tech Stack */}
            <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-4 mt-4">
              <h2 className="text-sm font-semibold text-[#3d3155] mb-3">
                Tech Stack
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {["Next.js 16", "TypeScript", "Tailwind", "Supabase", "Claude Haiku", "Recharts", "Spotify", "PWA", "AES-256", "Cloudflare", "Vercel", "GitHub"].map((tech) => (
                  <span key={tech} className="px-2 py-1 rounded-full bg-[#e8dff0] text-xs text-[#5a4a7a]">
                    {tech}
                  </span>
                ))}
              </div>
            </div>

            {/* DB Tables */}
            <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-4 mt-4">
              <h2 className="text-sm font-semibold text-[#3d3155] mb-3">
                Database Tables
              </h2>
              <div className="space-y-1 text-xs text-[#5a4a7a]">
                <p>• <strong>moods</strong> — emoji, label, trigger, helped</p>
                <p>• <strong>journals</strong> — content (encrypted), response (encrypted), liked</p>
                <p>• <strong>breathing_sessions</strong> — method</p>
                <p>• <strong>visits</strong> — ip, device, count</p>
                <p>• <strong>spotify_playlists</strong> — url, type, id, name</p>
                <p>• <strong>feedback</strong> — message</p>
                <p>• <strong>mood_options</strong> — custom trigger/helped tags per user</p>
                <p>• <strong>assessments</strong> — PHQ-9/GAD-7 scores and answers</p>
                <p>• <strong>photos</strong> (storage) — private per user</p>
              </div>
            </div>

            {/* API Routes */}
            <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-4 mt-4 mb-8">
              <h2 className="text-sm font-semibold text-[#3d3155] mb-3">
                API Routes
              </h2>
              <div className="space-y-1 text-xs text-[#5a4a7a]">
                <p>• <strong>/api/journal</strong> — encrypted CRUD</p>
                <p>• <strong>/api/respond</strong> — journal AI (20/hr)</p>
                <p>• <strong>/api/mood-respond</strong> — mood AI with history (20/hr)</p>
                <p>• <strong>/api/daily-summary</strong> — Peacemind Insight with assessment data (10/hr)</p>
                <p>• <strong>/api/mood-options</strong> — custom trigger/helped tags CRUD</p>
                <p>• <strong>/api/assessments</strong> — PHQ-9/GAD-7 scores CRUD</p>
                <p>• <strong>/api/visit</strong> — IP tracking (bot-filtered)</p>
              </div>
            </div>

            </>}

            {/* Refresh */}
            <button
              onClick={loadStats}
              className="mt-4 w-full py-2 rounded-2xl bg-white/50 text-sm text-[#7c6a9e] font-medium cursor-pointer hover:bg-white/70 transition-all"
            >
              Refresh
            </button>
          </>
        ) : (
          <p className="text-sm text-[#8a7da0] text-center">Loading stats...</p>
        )}

        {/* Daily Verse */}
        <DailyVerse />

        {/* Dedication */}
        <div className="mt-8 bg-white/30 rounded-2xl p-5 text-center">
          <p className="text-sm text-[#8a7da0] leading-relaxed italic">
            Built in loving memory of my dad, who lived with depression.
            <br />
            This app exists so that others like him can find help,
            <br />
            organize their lives, and hear the encouraging words
            <br />
            that everyone deserves — especially on the hardest days.
          </p>
          <p className="text-xs text-[#b0a3c4] mt-3">— With love, always</p>
        </div>

        {/* Build Info */}
        <BuildInfo />
      </div>
    </div>
  );
}
