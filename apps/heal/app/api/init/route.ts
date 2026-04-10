import { NextResponse } from "next/server";
import { getSupabase, getAuthenticatedUserId } from "@/lib/api-utils";
import { decrypt } from "@/lib/server-encrypt";
import { checkRateLimit, rateLimitResponse, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!checkRateLimit(`init:${ip}`, RATE_LIMITS.crud.limit, RATE_LIMITS.crud.windowMs)) {
    return rateLimitResponse();
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { accessToken } = body;
  if (!accessToken) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const supabase = getSupabase(accessToken);
  const userId = await getAuthenticatedUserId(supabase);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(now.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);
  const weekSince = sevenDaysAgo.toISOString();

  const yearAgo = new Date();
  yearAgo.setDate(yearAgo.getDate() - 365);
  const streakSince = yearAgo.toISOString();

  const lastSeen = body.feedbackLastSeen || "2000-01-01";

  // Run all queries in parallel — single DB round trip
  const [
    weekMoods,
    streakMoods,
    journals,
    breathing,
    seedBalance,
    seedHistory,
    feedbackUnread,
    goals,
    tasks,
    moodOptions,
  ] = await Promise.all([
    // Week moods (for summary chart)
    supabase
      .from("moods")
      .select("id, emoji, label, trigger, helped, photo_path, created_at")
      .eq("user_id", userId)
      .gte("created_at", weekSince)
      .order("created_at", { ascending: false })
      .limit(100),
    // Streak moods (year of dates for streak calc)
    supabase
      .from("moods")
      .select("created_at")
      .eq("user_id", userId)
      .gte("created_at", streakSince)
      .order("created_at", { ascending: false })
      .limit(400),
    // Recent journals (first page)
    supabase
      .from("journals")
      .select("id, content, response, liked, goal_id, photo_path, parent_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(0, 10),
    // Week breathing
    supabase
      .from("breathing_sessions")
      .select("id, method, created_at")
      .eq("user_id", userId)
      .gte("created_at", weekSince)
      .order("created_at", { ascending: false })
      .limit(100),
    // Seed balance
    supabase
      .from("seed_balances")
      .select("balance")
      .eq("user_id", userId)
      .single(),
    // Seed history
    supabase
      .from("seed_history")
      .select("action, amount, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
    // Unread feedback replies
    supabase
      .from("feedback")
      .select("id")
      .eq("user_id", userId)
      .not("reply", "is", null)
      .gt("replied_at", lastSeen),
    // Goals
    supabase
      .from("goals")
      .select("*")
      .eq("user_id", userId)
      .order("sort_order", { ascending: true }),
    // Tasks
    supabase
      .from("tasks")
      .select("id, goal_id, title, description, due_date, completed, completed_at, schedule_type, schedule_rule, duration, google_event_id, created_at")
      .eq("user_id", userId)
      .order("completed", { ascending: true })
      .order("due_date", { ascending: true, nullsFirst: false }),
    // Mood options
    supabase
      .from("mood_options")
      .select("*")
      .eq("user_id", userId),
  ]);

  // Decrypt moods
  const decryptedWeekMoods = (weekMoods.data || []).map((m) => ({
    ...m,
    trigger: m.trigger ? decrypt(m.trigger) : null,
    helped: m.helped ? decrypt(m.helped) : null,
  }));

  // Decrypt journals
  const journalRows = journals.data || [];
  const hasMoreJournals = journalRows.length > 10;
  const journalPage = hasMoreJournals ? journalRows.slice(0, 10) : journalRows;
  const decryptedJournals = journalPage.map((j) => ({
    ...j,
    content: decrypt(j.content),
    response: j.response ? decrypt(j.response) : null,
  }));

  // Decrypt goals
  const decryptedGoals = (goals.data || []).map((g) => ({
    ...g,
    name: g.name ? decrypt(g.name) : g.name,
    objective: g.objective ? decrypt(g.objective) : null,
  }));

  // Decrypt tasks
  const decryptedTasks = (tasks.data || []).map((t) => ({
    ...t,
    title: t.title ? decrypt(t.title) : t.title,
    description: t.description ? decrypt(t.description) : null,
  }));

  return NextResponse.json({
    weekMoods: decryptedWeekMoods,
    streakDates: (streakMoods.data || []).map((m) => m.created_at),
    journals: { data: decryptedJournals, hasMore: hasMoreJournals },
    breathing: breathing.data || [],
    seeds: {
      balance: seedBalance.data?.balance ?? 0,
      history: (seedHistory.data || []).map((h) => ({
        action: h.action,
        amount: h.amount,
        date: h.created_at,
      })),
    },
    unreadReplies: feedbackUnread.data?.length || 0,
    goals: decryptedGoals,
    tasks: decryptedTasks,
    moodOptions: moodOptions.data || [],
  });
}
