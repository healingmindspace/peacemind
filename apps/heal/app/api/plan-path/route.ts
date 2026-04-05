import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { checkRateLimit, rateLimitResponse, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!checkRateLimit(`plan-path:${ip}`, RATE_LIMITS.aiHeavy.limit, RATE_LIMITS.aiHeavy.windowMs)) {
    return rateLimitResponse();
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { pathName, objective, lang } = body;

  if (!objective) {
    return NextResponse.json({ error: "Missing objective" }, { status: 400 });
  }

  const langInstruction = lang === "zh"
    ? "Respond entirely in Simplified Chinese."
    : "Respond in English.";

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: `You are Peacemind — a gentle, caring companion who believes the simplest things can heal: stepping outside, feeling the sun, noticing something beautiful. Based on the path name and objective:

1. One warm sentence that makes them feel safe starting — no pressure, no urgency
2. Suggest 3 small, easy first steps — things so small they feel doable even on a hard day
3. Each step gets a schedule: "habit" (with freq+time), "once", or "gentle"
4. Use soft language: "maybe try", "when you're ready", "even just 5 minutes counts"

Respond in this JSON format:
{
  "message": "Your encouraging response (1-2 sentences)",
  "steps": [
    {
      "title": "Step title",
      "description": "Brief description",
      "scheduleType": "once" | "habit" | "gentle",
      "habitFreq": "daily" | "weekdays" | "weekly" (only for habit),
      "habitTime": "09:00" (only for habit),
      "duration": 15 (minutes, optional),
      "gentle": "thisWeek" | "soon" | "noRush" (only for gentle)
    }
  ]
}

CRITICAL: Output ONLY the JSON object. No markdown, no explanation, no text before or after. Just the JSON.
- ${langInstruction}`,
      messages: [{
        role: "user",
        // eslint-disable-next-line no-control-regex
        content: `Path: ${String(pathName).replace(/[\uD800-\uDFFF]/g, "")}\nObjective: ${objective.slice(0, 500).replace(/[\uD800-\uDFFF]/g, "")}`,
      }],
    });

    let text = message.content[0].type === "text" ? message.content[0].text : "";

    // Strip markdown code fences if present
    text = text.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();

    try {
      const parsed = JSON.parse(text);
      return NextResponse.json(parsed);
    } catch {
      // Try to extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          return NextResponse.json(parsed);
        } catch { /* fall through */ }
      }
      return NextResponse.json({ message: text, steps: [] });
    }
  } catch (err) {
    console.error("plan-path error:", err);
    return NextResponse.json({ error: "Failed to generate plan" }, { status: 500 });
  }
}
