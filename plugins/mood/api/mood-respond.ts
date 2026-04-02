import { getSupabase } from "@/lib/api-utils";
import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { encrypt } from "@/lib/server-encrypt";
import { checkRateLimit, rateLimitResponse, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!checkRateLimit(`mood-respond:${ip}`, RATE_LIMITS.ai.limit, RATE_LIMITS.ai.windowMs)) {
    return rateLimitResponse();
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { mood, trigger, helped, recentHistory, lang, moodId, accessToken } = body;

  if (!mood) {
    return NextResponse.json({ error: "Missing mood" }, { status: 400 });
  }

  const langInstruction = lang === "zh"
    ? "Respond entirely in Simplified Chinese."
    : "Respond in English.";

  const safeTrigger = trigger ? String(trigger).slice(0, 500) : null;
  const safeHelped = helped ? String(helped).slice(0, 500) : null;

  let context = `Current mood: ${String(mood.emoji).slice(0, 10)} ${String(mood.label).slice(0, 50)}`;
  if (safeTrigger) context += `\nWhat happened: ${safeTrigger}`;
  if (safeHelped) context += `\nWhat helped: ${safeHelped}`;

  if (recentHistory && recentHistory.length > 0) {
    context += `\n\nRecent mood history (last 7 days):`;
    for (const entry of recentHistory.slice(0, 10)) {
      context += `\n- ${entry.emoji} ${entry.label}`;
      if (entry.trigger) context += ` (trigger: ${entry.trigger})`;
      if (entry.helped) context += ` (helped: ${entry.helped})`;
    }
  }

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 40,
      system: `You are Healer — a gentle presence who believes the simplest things can heal: a walk outside, sunlight on your face, the smell of flowers, a deep breath of fresh air. Based on the user's mood, trigger, and history:
- Reply in 1 short sentence only (under 15 words)
- When it fits, gently suggest something simple and real — a walk, fresh air, looking at the sky
- Reference patterns or past coping if relevant
- No medical advice
- ${langInstruction}`,
      messages: [{ role: "user", content: context.replace(/[\uD800-\uDFFF]/g, "").slice(0, 2000) }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";

    // Save encrypted response to DB if moodId and accessToken provided
    if (moodId && accessToken) {
      const supabase = getSupabase(accessToken);
      await supabase
        .from("moods")
        .update({ response: encrypt(text) })
        .eq("id", moodId);
    }

    return NextResponse.json({ response: text });
  } catch {
    return NextResponse.json({ error: "Failed to generate response" }, { status: 500 });
  }
}
