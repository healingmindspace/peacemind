import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { checkRateLimit, rateLimitResponse, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";
import { createClient } from "@supabase/supabase-js";
import { getSupabase, getAuthenticatedUserId } from "@/lib/api-utils";
import { encrypt } from "@/lib/server-encrypt";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MOODS = [
  { emoji: "😊", label: "Good" },
  { emoji: "😌", label: "Calm" },
  { emoji: "😐", label: "Okay" },
  { emoji: "😔", label: "Low" },
  { emoji: "😢", label: "Sad" },
  { emoji: "😰", label: "Anxious" },
  { emoji: "😤", label: "Frustrated" },
  { emoji: "😴", label: "Tired" },
];

const TOOLS: Anthropic.Tool[] = [
  {
    name: "log_mood",
    description: "Log a mood for the user. Use when they express how they're feeling (e.g. 'I'm feeling anxious', 'I had a good day'). Pick the closest emoji match.",
    input_schema: {
      type: "object" as const,
      properties: {
        emoji: { type: "string", description: "One of: 😊 😌 😐 😔 😢 😰 😤 😴" },
        label: { type: "string", description: "One of: Good, Calm, Okay, Low, Sad, Anxious, Frustrated, Tired" },
        trigger: { type: "string", description: "What triggered this mood (optional)" },
      },
      required: ["emoji", "label"],
    },
  },
  {
    name: "write_journal",
    description: "Write a journal entry for the user. Use when they want to capture a thought, reflection, or experience.",
    input_schema: {
      type: "object" as const,
      properties: {
        content: { type: "string", description: "The journal entry content" },
      },
      required: ["content"],
    },
  },
  {
    name: "get_review",
    description: "Get a wellness review/summary for the user. Use when they ask 'how am I doing?', 'give me a review', or want to see their progress.",
    input_schema: {
      type: "object" as const,
      properties: {
        period: { type: "string", enum: ["today", "week", "month"], description: "Time period for the review" },
      },
      required: ["period"],
    },
  },
  {
    name: "save_feedback",
    description: "Save user feedback, bug report, or feature request.",
    input_schema: {
      type: "object" as const,
      properties: {
        message: { type: "string", description: "The feedback message" },
        subject: { type: "string", description: "Brief subject (bug, feature, feedback)" },
      },
      required: ["message"],
    },
  },
];

const SYSTEM_PROMPT = `You are Peacemind's friendly support assistant. You help users understand and use the Peacemind wellness app. Be warm, concise, and helpful. Answer in the same language the user writes in (English or Chinese).

## You Can Take Actions
You have tools to help users directly:
- **log_mood**: When a user tells you how they're feeling, offer to log it. If they confirm or it's clear, log it.
- **write_journal**: When a user wants to capture a thought or experience, write a journal entry.
- **get_review**: When a user asks how they're doing or wants a summary.
- **save_feedback**: When a user reports a bug or requests a feature.

Always confirm before taking action. Example: "It sounds like you're feeling anxious. Would you like me to log that for you?"
If the user says yes or confirms, use the tool.

## App Features

**Mood Tab (😊)** — Tap emoji to log mood, add triggers and what helped, view history (week/month/quarter)
**Calm Tab (🍃)** — Breathing (4-7-8, Box, Calm), 5-4-3-2-1 Grounding, PHQ-9/GAD-7 self-assessments, Learn section
**Grow Tab (🌱)** — Paths/goals, AI planning, calendar (week/month), journal with photos, associate entries with paths
**Me Tab (👤)** — Seeds (earned by actions), streak count, wellness overview

**General** — Bilingual EN/ZH, AES-256 encryption, no trackers, PWA, backfill past days, anonymous feedback

## Wellness Knowledge
- Anxiety: alarm system overdrive. Breathing calms vagus nerve.
- Depression: real brain chemistry condition, not weakness. Small steps help.
- Habit Loop: Cue → Routine → Reward. Swap routine, keep cue/reward.
- Self-Tracking: research-backed — awareness leads to change.
- PHQ-9: depression screen 0-27. GAD-7: anxiety screen 0-21.

## Rules
- Keep answers short (2-4 sentences)
- Confirm before taking actions
- Never make up features
- Be encouraging`;

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!checkRateLimit(`support:${ip}`, RATE_LIMITS.ai.limit, RATE_LIMITS.ai.windowMs)) {
    return rateLimitResponse();
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { message, history, accessToken } = body;
  if (!message?.trim()) {
    return NextResponse.json({ error: "Missing message" }, { status: 400 });
  }

  // Resolve user if authenticated
  let userId: string | null = null;
  if (accessToken) {
    const supabase = getSupabase(accessToken);
    userId = await getAuthenticatedUserId(supabase);
  }

  const messages: Anthropic.MessageParam[] = [
    ...(Array.isArray(history) ? history.slice(-10) : []),
    { role: "user" as const, content: message.trim() },
  ];

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages,
    });

    // Process tool calls
    const actions: { tool: string; result: string }[] = [];
    let textResponse = "";

    for (const block of response.content) {
      if (block.type === "text") {
        textResponse += block.text;
      }
      if (block.type === "tool_use") {
        const input = block.input as Record<string, string>;
        let result = "";

        if (block.name === "log_mood" && userId && accessToken) {
          const supabase = getSupabase(accessToken);
          const mood = MOODS.find((m) => m.emoji === input.emoji) || MOODS[2];
          const insertData: Record<string, unknown> = {
            user_id: userId,
            emoji: mood.emoji,
            label: mood.label,
          };
          if (input.trigger) insertData.trigger = encrypt(input.trigger);
          await supabase.from("moods").insert(insertData);
          result = `Logged mood: ${mood.emoji} ${mood.label}`;
          actions.push({ tool: "log_mood", result });
        }

        if (block.name === "write_journal" && userId && accessToken) {
          const supabase = getSupabase(accessToken);
          const encrypted = encrypt(input.content);
          await supabase.from("journals").insert({ user_id: userId, content: encrypted });
          result = "Journal entry saved";
          actions.push({ tool: "write_journal", result });
        }

        if (block.name === "get_review" && userId && accessToken) {
          const supabase = getSupabase(accessToken);
          const since = new Date();
          if (input.period === "week") since.setDate(since.getDate() - 7);
          else if (input.period === "month") since.setDate(since.getDate() - 30);
          else since.setHours(0, 0, 0, 0);

          const [moodRes, journalRes] = await Promise.all([
            supabase.from("moods").select("emoji, label, created_at").eq("user_id", userId).gte("created_at", since.toISOString()).order("created_at", { ascending: false }).limit(20),
            supabase.from("journals").select("id").eq("user_id", userId).gte("created_at", since.toISOString()),
          ]);

          const moods = moodRes.data || [];
          const journalCount = journalRes.data?.length || 0;
          const moodSummary = moods.map((m) => m.emoji).join(" ");
          result = `${input.period} review: ${moods.length} mood entries (${moodSummary}), ${journalCount} journal entries`;
          actions.push({ tool: "get_review", result });
        }

        if (block.name === "save_feedback") {
          if (process.env.SUPABASE_SERVICE_KEY) {
            const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
            await supabase.from("feedback").insert({
              user_id: userId,
              message: input.message.slice(0, 2000),
              subject: input.subject || "Support Chat",
            });
          }
          result = "Feedback saved — thank you!";
          actions.push({ tool: "save_feedback", result });
        }
      }
    }

    // If there were tool calls, get a follow-up response
    if (actions.length > 0 && response.stop_reason === "tool_use") {
      const toolResults: Anthropic.MessageParam = {
        role: "user",
        content: actions.map((a) => ({
          type: "tool_result" as const,
          tool_use_id: (response.content.find((b) => b.type === "tool_use" && b.name === a.tool) as Anthropic.ToolUseBlock | undefined)?.id || "",
          content: a.result,
        })),
      };

      const followUp = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        tools: TOOLS,
        messages: [...messages, { role: "assistant", content: response.content }, toolResults],
      });

      const followUpText = followUp.content.find((b) => b.type === "text");
      textResponse = followUpText?.text || actions.map((a) => a.result).join(". ");
    }

    return NextResponse.json({
      response: textResponse,
      actions: actions.map((a) => a.tool),
    });
  } catch (err) {
    console.error("support-chat error:", err);
    return NextResponse.json({ error: "Failed to respond" }, { status: 500 });
  }
}
