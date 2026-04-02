import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { checkRateLimit, rateLimitResponse, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!checkRateLimit(`daily-summary:${ip}`, RATE_LIMITS.aiHeavy.limit, RATE_LIMITS.aiHeavy.windowMs)) {
    return rateLimitResponse();
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { moods, journals, paths, assessments, lang, period } = body;

  if (!moods && !journals && !assessments) {
    return NextResponse.json({ error: "No data" }, { status: 400 });
  }

  if (!["today", "week", "month", "quarter"].includes(period || "today")) {
    return NextResponse.json({ error: "Invalid period" }, { status: 400 });
  }

  const langInstruction =
    lang === "zh"
      ? "Respond entirely in Simplified Chinese."
      : "Respond in English.";

  const periodLabel = period === "week" ? "this week" : period === "month" ? "this month" : period === "quarter" ? "this quarter" : "today";

  let context = "";
  if (moods?.length > 0) {
    const moodSlice = moods.slice(0, 50);
    context += `Moods ${periodLabel}:\n${moodSlice.map((m: { emoji: string; label: string; trigger?: string; helped?: string; time: string }) => {
      let line = `${m.emoji} ${m.label} (${m.time})`;
      if (m.trigger) line += ` — triggered by: ${m.trigger}`;
      if (m.helped) line += ` — helped by: ${m.helped}`;
      return line;
    }).join("\n")}.\n`;
  }
  if (journals?.length > 0) {
    const journalSlice = journals.slice(0, 20);
    context += `Journal entries ${periodLabel}:\n${journalSlice.map((j: { content: string }) => `- "${String(j.content).slice(0, 200)}"`).join("\n")}\n`;
  }
  if (paths?.length > 0) {
    context += `Path progress ${periodLabel}:\n${paths.map((p: { name: string; icon: string; completed: number; total: number }) => `${p.icon} ${p.name}: ${p.completed}/${p.total} steps done`).join("\n")}\n`;
  }
  if (assessments?.length > 0) {
    context += `\nSelf-assessment scores:\n${assessments.map((a: { type: string; score: number; date: string }) => `${a.type}: ${a.score} (taken ${a.date})`).join("\n")}\n`;
  }

  const assessmentNote = assessments?.length > 0
    ? " If self-assessment scores are provided, gently acknowledge them — note if scores are low (good) or elevated, and what might be helping. Never diagnose."
    : "";

  const systemPrompt = period === "today"
    ? `You are Peacemind — a gentle presence who believes the simplest things can heal: a walk outside, sunlight, flowers, fresh air. Based on the user's daily mood, triggers, coping strategies, journal data, and path progress, write a brief (2-3 sentences) compassionate daily insight. When it fits, remind them of something simple and real.${assessmentNote} Never give medical advice. ${langInstruction}`
    : `You are Peacemind — a gentle presence who believes the simplest things can heal: a walk outside, sunlight, flowers, fresh air. Based on the user's mood, triggers, coping strategies, journal data, and path progress over ${periodLabel}, write a brief (3-4 sentences) compassionate summary. Notice recurring triggers, which coping tools worked, mention path progress, and offer gentle encouragement.${assessmentNote} When it fits, suggest something simple. Never give medical advice. ${langInstruction}`;

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: "user", content: context.replace(/[\uD800-\uDFFF]/g, "").slice(0, 4000) }],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";

    return NextResponse.json({ summary: text });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate summary" },
      { status: 500 }
    );
  }
}
