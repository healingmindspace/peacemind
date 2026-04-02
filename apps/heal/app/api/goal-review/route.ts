import { getSupabase, getAuthenticatedUserId } from "@/lib/api-utils";
import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { decrypt } from "@/lib/server-encrypt";
import { checkRateLimit, rateLimitResponse, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!checkRateLimit(`goal-review:${ip}`, RATE_LIMITS.aiLight.limit, RATE_LIMITS.aiLight.windowMs)) {
    return rateLimitResponse();
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { accessToken, lang, period } = body;
  if (!accessToken) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const supabase = getSupabase(accessToken);
  const userId = await getAuthenticatedUserId(supabase);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {

  // Calculate date range
  const now = new Date();
  let since: Date;
  if (period === "lastWeek") {
    since = new Date(now);
    since.setDate(since.getDate() - 14);
  } else {
    since = new Date(now);
    since.setDate(since.getDate() - 7);
  }

  // Fetch goals
  const { data: goalsData, error: goalsError } = await supabase
    .from("goals")
    .select("id, name, icon, objective, deleted")
    .eq("user_id", userId);

  if (goalsError) {
    return NextResponse.json({ error: goalsError.message }, { status: 500 });
  }

  const goals = (goalsData || [])
    .filter((g) => !g.deleted)
    .map((g) => ({
      ...g,
      name: decrypt(g.name),
      objective: g.objective ? decrypt(g.objective) : null,
    }));

  // Fetch tasks for the period
  const { data: tasksData } = await supabase
    .from("tasks")
    .select("id, goal_id, title, completed, completed_at, schedule_type, created_at")
    .eq("user_id", userId);

  const tasks = (tasksData || []).map((t) => ({
    ...t,
    title: decrypt(t.title),
  }));

  // Split tasks by goal
  const completedThisWeek = tasks.filter((t) => t.completed && t.completed_at && new Date(t.completed_at) >= since);
  const incomplete = tasks.filter((t) => !t.completed);

  // Fetch journals for the period
  const { data: journalsData } = await supabase
    .from("journals")
    .select("id, content, goal_id, created_at")
    .eq("user_id", userId)
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false })
    .limit(10);

  const journals = (journalsData || []).map((j) => ({
    ...j,
    content: decrypt(j.content),
  }));

  // Build context for AI
  let context = "";
  for (const goal of goals) {
    const goalCompleted = completedThisWeek.filter((t) => t.goal_id === goal.id);
    const goalIncomplete = incomplete.filter((t) => t.goal_id === goal.id);
    context += `\nPath: ${goal.icon} ${goal.name}`;
    if (goal.objective) context += ` (objective: ${goal.objective})`;
    context += `\n  Completed this week: ${goalCompleted.length > 0 ? goalCompleted.map((t) => t.title).join(", ") : "none"}`;
    context += `\n  Still to do: ${goalIncomplete.length > 0 ? goalIncomplete.map((t) => t.title).join(", ") : "none"}`;
  }

  // Unassigned tasks
  const unassignedCompleted = completedThisWeek.filter((t) => !t.goal_id);
  const unassignedIncomplete = incomplete.filter((t) => !t.goal_id);
  if (unassignedCompleted.length > 0 || unassignedIncomplete.length > 0) {
    context += `\nOther steps:`;
    if (unassignedCompleted.length > 0) context += `\n  Completed: ${unassignedCompleted.map((t) => t.title).join(", ")}`;
    if (unassignedIncomplete.length > 0) context += `\n  To do: ${unassignedIncomplete.map((t) => t.title).join(", ")}`;
  }

  if (journals.length > 0) {
    context += `\n\nJournal entries this week:`;
    for (const j of journals.slice(0, 5)) {
      const goalTag = j.goal_id ? goals.find((g) => g.id === j.goal_id)?.name || "" : "";
      context += `\n- ${goalTag ? `[${goalTag}] ` : ""}${j.content.slice(0, 100)}`;
    }
  }

  // Fetch moods for pattern detection
  const { data: moodsData } = await supabase
    .from("moods")
    .select("emoji, label, trigger, helped, created_at")
    .eq("user_id", userId)
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false })
    .limit(50);

  const moods = (moodsData || []).map((m: { emoji: string; label: string; trigger: string | null; helped: string | null }) => ({
    ...m,
    trigger: m.trigger ? decrypt(m.trigger) : null,
    helped: m.helped ? decrypt(m.helped) : null,
  }));

  if (moods.length > 0) {
    // Mood distribution
    const moodCounts = new Map<string, number>();
    moods.forEach((m: { label: string }) => moodCounts.set(m.label, (moodCounts.get(m.label) || 0) + 1));

    // Recurring triggers
    const triggerCounts = new Map<string, number>();
    moods.forEach((m: { trigger: string | null }) => {
      if (m.trigger) m.trigger.split(", ").forEach((t: string) => {
        const trimmed = t.trim();
        if (trimmed) triggerCounts.set(trimmed, (triggerCounts.get(trimmed) || 0) + 1);
      });
    });
    const recurring = Array.from(triggerCounts.entries()).filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1]);

    context += `\n\nMoods this week (${moods.length}): ${Array.from(moodCounts.entries()).map(([l, c]) => `${l}(${c})`).join(", ")}`;
    if (recurring.length > 0) {
      context += `\nRecurring triggers: ${recurring.map(([t, c]) => `"${t}"(${c}x)`).join(", ")}`;
    }

    const helpedCounts = new Map<string, number>();
    moods.forEach((m: { helped: string | null }) => {
      if (m.helped) m.helped.split(", ").forEach((h: string) => {
        const trimmed = h.trim();
        if (trimmed) helpedCounts.set(trimmed, (helpedCounts.get(trimmed) || 0) + 1);
      });
    });
    if (helpedCounts.size > 0) {
      context += `\nWhat helped: ${Array.from(helpedCounts.entries()).map(([h, c]) => `${h}(${c}x)`).join(", ")}`;
    }
  }

  const langInstruction = lang === "zh"
    ? "Respond entirely in Simplified Chinese."
    : "Respond in English.";

  // If no data at all, return a gentle default
  if (!context.trim()) {
    const stats = {
      totalCompleted: 0,
      totalIncomplete: 0,
      journalCount: 0,
      byGoal: goals.map((g) => ({ name: g.name, icon: g.icon, completed: 0, remaining: 0 })),
    };
    const defaultReview = lang === "zh"
      ? "这周刚刚开始。试着给自己设一个小目标——哪怕只是出去走走，感受一下阳光。"
      : "This week is just beginning. Try setting one small goal — even just stepping outside to feel the sun.";
    return NextResponse.json({ review: defaultReview, stats });
  }

  // Strip invalid Unicode surrogates that break JSON serialization
  // eslint-disable-next-line no-control-regex
  context = context.replace(/[\uD800-\uDFFF]/g, "");

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      system: period === "ahead"
        ? `You are Peacemind — a warm companion who knows that walks, sunlight, flowers, and fresh air can quietly change everything. Based on the user's paths, objectives, incomplete steps, and recent mood patterns, write a hopeful look ahead:

- For each active path, suggest ONE small, gentle next step they could take
- If mood patterns show something recurring, offer one simple thing to try (a walk, fresh air, something beautiful)
- End with a warm sentence about what's possible — focus on hope, not pressure

Keep it very short — bullet-point style. Be hopeful, gentle, like a friend who believes in them.
- ${langInstruction}`
        : `You are Peacemind — a warm companion who knows that walks, sunlight, flowers, and fresh air can quietly change everything. Review the week briefly:

For each path that had activity, write ONE line: what was done.
If mood data shows recurring triggers (2+ times), gently mention it and suggest one small step.
Then ONE line: next week's focus.
Then ONE short encouraging sentence.

Keep it very short — bullet-point style, not paragraphs. No filler. Be gentle, not pushy.
- ${langInstruction}`,
      messages: [{ role: "user", content: context.slice(0, 4000) }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";

    // Summary stats
    const stats = {
      totalCompleted: completedThisWeek.length,
      totalIncomplete: incomplete.length,
      journalCount: journals.length,
      byGoal: goals.map((g) => ({
        name: g.name,
        icon: g.icon,
        completed: completedThisWeek.filter((t) => t.goal_id === g.id).length,
        remaining: incomplete.filter((t) => t.goal_id === g.id).length,
      })),
    };

    return NextResponse.json({ review: text, stats });
  } catch (err) {
    return NextResponse.json({ error: "Failed to generate review", details: String(err) }, { status: 500 });
  }

  } catch (outerErr) {
    return NextResponse.json({ error: "Review failed", details: String(outerErr) }, { status: 500 });
  }
}
