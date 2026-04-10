import { NextResponse } from "next/server";
import { getSupabase, getAuthenticatedUserId } from "@/lib/api-utils";

const DEFAULT_SUGGESTIONS = {
  en: ["What's on my calendar?", "I'm feeling good today", "Write a journal for me", "Weekly review", "Add a task", "What's the weather?", "How do I log mood?", "What is anxiety?"],
  zh: ["今天有什么安排？", "我今天心情不错", "帮我写日记", "这周报告", "添加日程", "今天天气怎样？", "怎么记录心情？", "什么是焦虑？"],
};

const TOPIC_SUGGESTIONS: Record<string, { en: string; zh: string }> = {
  mood: { en: "How am I feeling lately?", zh: "我最近心情怎么样？" },
  journal: { en: "Write a journal entry", zh: "帮我写日记" },
  calendar: { en: "What's on my calendar?", zh: "今天有什么安排？" },
  review: { en: "Give me a weekly review", zh: "这周报告" },
  weather: { en: "What's the weather?", zh: "今天天气怎样？" },
  wellness: { en: "Tell me about anxiety", zh: "什么是焦虑？" },
  help: { en: "How do features work?", zh: "怎么使用功能？" },
};

export async function POST(request: Request) {
  let body;
  try { body = await request.json(); } catch { return NextResponse.json(DEFAULT_SUGGESTIONS); }

  const { accessToken, lang } = body;
  if (!accessToken) return NextResponse.json(DEFAULT_SUGGESTIONS);

  const supabase = getSupabase(accessToken);
  const userId = await getAuthenticatedUserId(supabase);
  if (!userId) return NextResponse.json(DEFAULT_SUGGESTIONS);

  // Get user's top topics
  const { data } = await supabase
    .from("agent_usage")
    .select("topic")
    .eq("user_id", userId)
    .not("topic", "is", null)
    .order("created_at", { ascending: false })
    .limit(50);

  if (!data || data.length < 3) return NextResponse.json(DEFAULT_SUGGESTIONS);

  // Count topics
  const counts: Record<string, number> = {};
  data.forEach((r) => { if (r.topic) counts[r.topic] = (counts[r.topic] || 0) + 1; });
  const topTopics = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([t]) => t);

  // Build personalized suggestions — top topics first, then defaults
  const l = lang === "zh" ? "zh" : "en";
  const personalized = topTopics
    .filter((t) => TOPIC_SUGGESTIONS[t])
    .map((t) => TOPIC_SUGGESTIONS[t][l]);
  const defaults = DEFAULT_SUGGESTIONS[l].filter((s) => !personalized.includes(s));
  const suggestions = [...personalized, ...defaults].slice(0, 8);

  return NextResponse.json(suggestions);
}
