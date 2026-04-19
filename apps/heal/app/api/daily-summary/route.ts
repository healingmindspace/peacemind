import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { checkRateLimit, rateLimitResponse, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";
import { getSupabase, getAuthenticatedUserId } from "@/lib/api-utils";
import { encrypt, decrypt } from "@/lib/server-encrypt";
import { TABLES } from "@/lib/tables";

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

  const { action, accessToken, moods, journals, paths, assessments, lang, period } = body;

  if (!["today", "week", "month", "quarter"].includes(period || "today")) {
    return NextResponse.json({ error: "Invalid period" }, { status: 400 });
  }

  const effectivePeriod = period || "today";
  const effectiveLang = lang || "en";
  const todayStr = new Date().toISOString().slice(0, 10);

  // If accessToken provided, try to load/save from DB
  if (accessToken) {
    const supabase = getSupabase(accessToken);
    const userId = await getAuthenticatedUserId(supabase);

    if (userId && action === "get") {
      // Try to load existing insight from DB
      const { data: existing } = await supabase
        .from(TABLES.savedInsights)
        .select("content, created_at")
        .eq("user_id", userId)
        .eq("period", effectivePeriod)
        .eq("data_date", todayStr)
        .eq("lang", effectiveLang)
        .single();

      if (existing) {
        return NextResponse.json({
          summary: decrypt(existing.content),
          saved: true,
          created_at: existing.created_at,
        });
      }

      // No saved insight for today
      return NextResponse.json({ summary: null, saved: false });
    }

    // Generate (default action or explicit "generate")
    if (!moods && !journals && !assessments) {
      return NextResponse.json({ error: "No data" }, { status: 400 });
    }

    const summary = await generateInsight(moods, journals, paths, assessments, effectiveLang, effectivePeriod);
    if (!summary) {
      return NextResponse.json({ error: "Failed to generate summary" }, { status: 500 });
    }

    // Save to DB if authenticated
    if (userId) {
      const encrypted = encrypt(summary);

      // Upsert: delete existing for same user/period/date/lang, then insert
      await supabase
        .from(TABLES.savedInsights)
        .delete()
        .eq("user_id", userId)
        .eq("period", effectivePeriod)
        .eq("data_date", todayStr)
        .eq("lang", effectiveLang);

      await supabase
        .from(TABLES.savedInsights)
        .insert({
          id: `insight_v1_${crypto.randomUUID()}`,
          user_id: userId,
          period: effectivePeriod,
          content: encrypted,
          data_date: todayStr,
          lang: effectiveLang,
        });
    }

    return NextResponse.json({ summary, saved: true });
  }

  // Fallback: no auth, just generate (backward compatible)
  if (!moods && !journals && !assessments) {
    return NextResponse.json({ error: "No data" }, { status: 400 });
  }

  const summary = await generateInsight(moods, journals, paths, assessments, effectiveLang, effectivePeriod);
  if (!summary) {
    return NextResponse.json({ error: "Failed to generate summary" }, { status: 500 });
  }

  return NextResponse.json({ summary });
}

async function generateInsight(
  moods: { emoji: string; label: string; trigger?: string; helped?: string; time: string }[] | undefined,
  journals: { content: string }[] | undefined,
  paths: { name: string; icon: string; completed: number; total: number; estimatedMinutes?: number }[] | undefined,
  assessments: { type: string; score: number; date: string }[] | undefined,
  lang: string,
  period: string,
): Promise<string | null> {
  const langInstruction =
    lang === "zh"
      ? "Respond entirely in Simplified Chinese."
      : "Respond in English.";

  const periodLabel = period === "week" ? "this week" : period === "month" ? "this month" : period === "quarter" ? "this quarter" : "today";

  let context = "";
  if (moods?.length) {
    const moodSlice = moods.slice(0, 50);
    context += `Moods ${periodLabel}:\n${moodSlice.map((m) => {
      let line = `${m.emoji} ${m.label} (${m.time})`;
      if (m.trigger) line += ` — triggered by: ${m.trigger}`;
      if (m.helped) line += ` — helped by: ${m.helped}`;
      return line;
    }).join("\n")}.\n`;
  }
  if (journals?.length) {
    const journalSlice = journals.slice(0, 20);
    context += `Journal entries ${periodLabel}:\n${journalSlice.map((j) => `- "${String(j.content).slice(0, 200)}"`).join("\n")}\n`;
  }
  if (paths?.length) {
    context += `Path progress ${periodLabel}:\n${paths.map((p) => `${p.icon} ${p.name}: ${p.completed}/${p.total} steps done (~${p.estimatedMinutes || 0} min spent)`).join("\n")}\n`;
  }
  if (assessments?.length) {
    context += `\nSelf-assessment scores:\n${assessments.map((a) => `${a.type}: ${a.score} (taken ${a.date})`).join("\n")}\n`;
  }

  const assessmentNote = assessments?.length
    ? " If self-assessment scores are provided, gently acknowledge them — note if scores are low (good) or elevated, and what might be helping. Never diagnose."
    : "";

  const systemPrompt = period === "today"
    ? `You are Peacemind — a gentle presence who believes the simplest things can heal: a walk outside, sunlight, flowers, fresh air. Based on the user's daily mood, triggers, coping strategies, journal data, and path progress, write a brief (2-3 sentences) compassionate daily insight. When it fits, remind them of something simple and real.${assessmentNote} Never give medical advice. ${langInstruction}`
    : `You are Peacemind — a gentle presence who believes the simplest things can heal: a walk outside, sunlight, flowers, fresh air. Based on the user's mood, triggers, coping strategies, journal data, and path progress over ${periodLabel}, write a brief (3-4 sentences) compassionate summary. Notice recurring triggers, which coping tools worked, mention path progress with estimated time spent on each path, and offer gentle encouragement.${assessmentNote} When it fits, suggest something simple. Never give medical advice. ${langInstruction}`;

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: "user", content: context.replace(/[\uD800-\uDFFF]/g, "").slice(0, 4000) }],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";

    return text || null;
  } catch {
    return null;
  }
}
