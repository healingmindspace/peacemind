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
  if (!checkRateLimit(`daily-comfort:${ip}`, RATE_LIMITS.aiHeavy.limit, RATE_LIMITS.aiHeavy.windowMs)) {
    return rateLimitResponse();
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { accessToken, lang } = body;

  const langInstruction = lang === "zh"
    ? "Respond in Simplified Chinese."
    : "Respond in English.";

  let context = "";

  // If user is logged in, get recent mood context
  if (accessToken) {
    const supabase = getSupabase(accessToken);
    const userId = await getAuthenticatedUserId(supabase);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const { data: moods } = await supabase
      .from("moods")
      .select("emoji, label, trigger, helped")
      .eq("user_id", userId)
      .gte("created_at", weekAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(20);

    if (moods && moods.length > 0) {
      // Mood distribution
      const counts = new Map<string, number>();
      moods.forEach((m) => counts.set(m.label, (counts.get(m.label) || 0) + 1));
      context = `This week's moods (${moods.length} entries): ${Array.from(counts.entries()).map(([l, c]) => `${l}(${c})`).join(", ")}`;

      // Recent triggers
      const triggers = moods.slice(0, 5).map((m) => m.trigger ? decrypt(m.trigger) : "").filter(Boolean);
      if (triggers.length > 0) context += `. Recent triggers: ${triggers.join(", ")}`;

      // What helped
      const helped = moods.map((m) => m.helped ? decrypt(m.helped) : "").filter(Boolean);
      if (helped.length > 0) {
        const helpCounts = new Map<string, number>();
        helped.forEach((h) => h.split(", ").forEach((item) => { if (item.trim()) helpCounts.set(item.trim(), (helpCounts.get(item.trim()) || 0) + 1); }));
        context += `. What helped: ${Array.from(helpCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([h, c]) => `${h}(${c}x)`).join(", ")}`;
      }
    }
  }

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 30,
      system: `You are Healer — a gentle presence, like someone who knows that a walk in the sun, the smell of flowers, or a moment of fresh air can quietly change everything. Write ONE short comfort message (under 12 words).
${context ? "Personalize based on their recent moods, but don't mention triggers directly — just reflect the feeling warmly. Sometimes suggest something simple: a walk, sunlight, looking at something beautiful." : "Be universally comforting. Remind them of simple, beautiful things."}
No quotes. No emoji. Just the words.
- ${langInstruction}`,
      messages: [{ role: "user", content: (context || "Give me comfort today.").replace(/[\uD800-\uDFFF]/g, "") }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    return NextResponse.json({ message: text.trim() });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
