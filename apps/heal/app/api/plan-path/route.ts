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
      system: `You are Peacemind — a gentle, caring companion. Based on the path name and objective, create actionable steps.

IMPORTANT: Detect the type of objective and respond accordingly:

**If the objective contains specific dates, deadlines, or events:**
- Extract each date/event as a separate step with the exact date
- Use "once" scheduleType with a dueDate for each
- Title should be the event name (e.g. "Application & fees due")
- Description should include key details (time, location, what to prepare)
- Add a preparation reminder step before important deadlines if helpful
- Be specific — use the actual dates and details from the objective

**If the objective is a general goal (no specific dates):**
- Suggest 3 small, easy first steps — things doable even on a hard day
- Each step gets a schedule: "habit" (with freq+time), "once", or "gentle"
- Use soft language: "maybe try", "when you're ready"

Respond in this JSON format:
{
  "message": "One encouraging sentence (1-2 sentences max)",
  "steps": [
    {
      "title": "Step title (short and clear)",
      "description": "Brief details",
      "scheduleType": "once" | "habit" | "gentle",
      "dueDate": "2026-03-31" (ISO date, only for date-specific steps),
      "habitFreq": "daily" | "weekdays" | "weekly" (only for habit),
      "habitTime": "09:00" (only for habit),
      "duration": 15 (minutes, optional),
      "gentle": "thisWeek" | "soon" | "noRush" (only for gentle)
    }
  ]
}

CRITICAL: Output ONLY the JSON object. No markdown, no explanation, no text before or after. Just the JSON.
- Keep step titles short (under 40 chars). Put details in description.
- ${langInstruction}`,
      messages: [{
        role: "user",
        // eslint-disable-next-line no-control-regex
        content: `Path: ${String(pathName).replace(/[\uD800-\uDFFF]/g, "")}\nObjective: ${objective.slice(0, 500).replace(/[\uD800-\uDFFF]/g, "")}`,
      }],
    });

    if (message.stop_reason === "max_tokens") {
      console.error("plan-path: response truncated (max_tokens)");
      return NextResponse.json({ error: "Plan was too complex — try a simpler objective", code: "truncated" }, { status: 500 });
    }

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
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("plan-path error:", errMsg);
    if (errMsg.includes("rate") || errMsg.includes("429")) {
      return NextResponse.json({ error: "Too many requests — please wait a moment", code: "rate_limit" }, { status: 429 });
    }
    return NextResponse.json({ error: "Something went wrong — please try again", code: "unknown" }, { status: 500 });
  }
}
