import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { checkRateLimit, rateLimitResponse, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!checkRateLimit(`extract-photo:${ip}`, RATE_LIMITS.ai.limit, RATE_LIMITS.ai.windowMs)) {
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
    ? "Respond in Simplified Chinese."
    : "Respond in English.";

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      system: `You extract and summarize content from photos for a journal entry. Based on the image:

- If it contains text (handwritten notes, screenshots, messages), transcribe the key content
- If it's a photo of a moment (food, nature, people, activity), describe what you see warmly in 1-2 sentences as a journal entry
- If it's a receipt, ticket, or document, extract the key details (date, place, amount)
- Keep it natural — write it as the person would in their journal
- ${langInstruction}`,
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
          { type: "text", text: "Extract or describe this for my journal." },
        ],
      }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    return NextResponse.json({ text });
  } catch (err) {
    console.error("extract-photo error:", err);
    return NextResponse.json({ error: "Failed to process image" }, { status: 500 });
  }
}
