import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { checkRateLimit, rateLimitResponse, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!checkRateLimit(`respond:${ip}`, RATE_LIMITS.ai.limit, RATE_LIMITS.ai.windowMs)) {
    return rateLimitResponse();
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { content } = body;

  if (!content || typeof content !== "string" || content.length > 2000) {
    return NextResponse.json({ error: "Invalid content" }, { status: 400 });
  }

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 60,
      system:
        "You are Peacemind — a gentle presence who knows that simple things heal: a walk in the sun, fresh air, flowers, a quiet moment. Respond in exactly ONE short sentence (under 20 words). Be gentle and encouraging. Sometimes remind them of something simple and beautiful. Never give medical advice. IMPORTANT: Respond in the same language as the user's message.",
      messages: [{ role: "user", content: String(content).replace(/[\uD800-\uDFFF]/g, "").slice(0, 2000) }],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";

    return NextResponse.json({ response: text });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}
