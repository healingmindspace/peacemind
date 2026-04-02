import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { checkRateLimit, rateLimitResponse, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!checkRateLimit(`extract-mood-photo:${ip}`, RATE_LIMITS.ai.limit, RATE_LIMITS.ai.windowMs)) {
    return rateLimitResponse();
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { image, lang } = body;
  if (!image) {
    return NextResponse.json({ error: "Missing image" }, { status: 400 });
  }

  const langInstruction = lang === "zh"
    ? "Respond in Simplified Chinese for the trigger field."
    : "Respond in English for the trigger field.";

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 100,
      system: `You analyze a photo to understand what's happening. Respond ONLY in this JSON format:
{
  "trigger": "one or two words for the category (e.g. Work, Family, Friends, Health, Nature, Food, School)",
  "details": "warm brief description of what you see (under 15 words)",
  "suggestion": "one gentle thing that might help right now (under 10 words)"
}
Only output valid JSON. The trigger must be short (1-2 words). ${langInstruction}`,
      messages: [{
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: image.split(";")[0].split(":")[1] as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
              data: image.split(",")[1],
            },
          },
          { type: "text", text: "What mood does this photo suggest?" },
        ],
      }],
    });

    let text = message.content[0].type === "text" ? message.content[0].text : "";
    text = text.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();

    try {
      const parsed = JSON.parse(text);
      return NextResponse.json(parsed);
    } catch {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return NextResponse.json(JSON.parse(jsonMatch[0]));
        } catch { /* fall through */ }
      }
      return NextResponse.json({ trigger: "", suggestion: "" });
    }
  } catch {
    return NextResponse.json({ error: "Failed to process image" }, { status: 500 });
  }
}
