import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { checkRateLimit, rateLimitResponse, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";
import { createClient } from "@supabase/supabase-js";
import { getSupabase, getAuthenticatedUserId } from "@/lib/api-utils";
import { encrypt, decrypt } from "@/lib/server-encrypt";

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
        trigger: { type: "string", description: "What triggered this mood (extract from message if mentioned)" },
        helped: { type: "string", description: "What helped or what they're grateful for (extract from message if mentioned)" },
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
    name: "get_insight",
    description: "Generate a personalized wellness insight based on the user's recent mood and journal data. Use when they ask for 'insight', 'how am I doing emotionally', 'patterns', or 'what should I focus on'.",
    input_schema: {
      type: "object" as const,
      properties: {
        period: { type: "string", enum: ["week", "month"], description: "Time period" },
      },
      required: ["period"],
    },
  },
  {
    name: "get_calendar",
    description: "Get calendar items/tasks. Use when user asks about schedule, calendar, tasks, or what's coming up. 'today' = today only. 'week' = next 7 days. 'month' = next 30 days.",
    input_schema: {
      type: "object" as const,
      properties: {
        period: { type: "string", enum: ["today", "week", "month"], description: "today, week, or month" },
      },
      required: ["period"],
    },
  },
  {
    name: "create_task",
    description: "Create a calendar task or reminder. Use when user says 'add', 'schedule', 'remind me', 'put on calendar', or similar. Extract the title, date, and time from the message.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "Task title (e.g. 'Meeting with John')" },
        dueDate: { type: "string", description: "ISO date string YYYY-MM-DD (e.g. '2026-04-11'). Parse from 'tomorrow', 'Friday', 'next Monday', etc." },
        dueTime: { type: "string", description: "Time in HH:MM format (e.g. '14:00'). Parse from '2pm', '3:30', etc. Optional." },
        duration: { type: "number", description: "Duration in minutes. Optional." },
      },
      required: ["title", "dueDate"],
    },
  },
  {
    name: "get_weather",
    description: "Get current weather. Use when user asks about weather, temperature, or if they should bring an umbrella.",
    input_schema: {
      type: "object" as const,
      properties: {
        location: { type: "string", description: "City name or zip code. Ask if not provided." },
      },
      required: ["location"],
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

// Anonymous: basic knowledge only, no tools
const ANON_PROMPT = `You are Peacemind's support assistant. Warm, concise. Answer in the user's language (EN or ZH).

Features: Mood tracking (😊), Breathing/Grounding/Assessments (🍃), Goals/Journal/Calendar (🌱), Seeds/Streaks (👤). Bilingual, encrypted, no trackers.

Wellness: Anxiety = alarm system overdrive, breathing helps. Depression = brain chemistry, not weakness. PHQ-9 (0-27) and GAD-7 (0-21) are self-awareness tools.

If user wants to log mood, write journal, or get a review, say: "Sign in to use that feature — your data is encrypted and private."
Keep answers to 2-3 sentences. Never make up features.`;

// Authenticated: full tools + action rules
const AUTH_PROMPT = `You are Peacemind's support assistant. Warm, concise. Answer in the user's language (EN or ZH).

Features: Mood (😊), Calm (🍃 breathing/grounding/assessments), Grow (🌱 goals/journal/calendar), Me (👤 seeds/streaks). Bilingual, encrypted, no trackers.

Wellness: Anxiety = breathing calms vagus nerve. Depression = brain chemistry, small steps help. PHQ-9: 0-27. GAD-7: 0-21.

ACTION RULES:
- log_mood: Extract mood, trigger, and what helped from the user's message. If they say "I'm happy because work went well and exercise helped", call immediately with all three. Only ask follow-up if the mood is unclear. Trigger and helped are optional — log with what you have.
- write_journal: Ask what to write if not provided. Call with real content.
- get_review/get_insight: Ask period (today/week/month) if unclear.
- save_feedback: Call directly for bugs or feature requests.

Keep answers to 2-3 sentences.`;

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

  const rawHistory = Array.isArray(history) ? history.slice(-10) : [];
  // Filter out empty messages and ensure valid alternation
  const cleanHistory: Anthropic.MessageParam[] = [];
  for (const msg of rawHistory) {
    if (msg.content && typeof msg.content === "string" && msg.content.trim()) {
      cleanHistory.push({ role: msg.role as "user" | "assistant", content: msg.content.trim() });
    }
  }
  // Ensure messages alternate user/assistant — merge consecutive same-role
  const messages: Anthropic.MessageParam[] = [];
  for (const msg of [...cleanHistory, { role: "user" as const, content: message.trim() }]) {
    const last = messages[messages.length - 1];
    if (last && last.role === msg.role) {
      last.content = `${last.content}\n${msg.content}`;
    } else {
      messages.push({ ...msg });
    }
  }

  try {
    const isAuth = !!userId;
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: isAuth ? 500 : 300,
      system: [{ type: "text", text: isAuth ? AUTH_PROMPT : ANON_PROMPT, cache_control: { type: "ephemeral" } }],
      ...(isAuth ? { tools: TOOLS } : {}),
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
          if (input.helped) insertData.helped = encrypt(input.helped);
          await supabase.from("moods").insert(insertData);
          // Award seeds
          await fetch(new URL("/api/seeds", request.url).toString(), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "award", accessToken, seedAction: "mood", amount: 5 }),
          }).catch(() => {});
          result = `Logged mood: ${mood.emoji} ${mood.label}${input.trigger ? ` | Trigger: ${input.trigger}` : ""}${input.helped ? ` | Helped: ${input.helped}` : ""} (+5 seeds 🌱)`;
          actions.push({ tool: "log_mood", result });
        }

        if (block.name === "write_journal" && userId && accessToken) {
          if (input.content && input.content.trim().length > 2) {
            const supabase = getSupabase(accessToken);
            const encrypted = encrypt(input.content.trim());
            await supabase.from("journals").insert({ user_id: userId, content: encrypted, response: encrypt("via Peacemind Assistant") });
            // Award seeds
            await fetch(new URL("/api/seeds", request.url).toString(), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "award", accessToken, seedAction: "journal", amount: 5 }),
            }).catch(() => {});
            result = "Journal entry saved (+5 seeds 🌱)";
          } else {
            result = "Need content to write — ask the user what they want to journal about";
          }
          actions.push({ tool: "write_journal", result });
        }

        if ((block.name === "get_review" || block.name === "get_insight") && userId && accessToken) {
          const supabase = getSupabase(accessToken);
          const since = new Date();
          if (input.period === "month") since.setDate(since.getDate() - 30);
          else if (input.period === "week") since.setDate(since.getDate() - 7);
          else since.setHours(0, 0, 0, 0);

          const [moodRes, journalRes] = await Promise.all([
            supabase.from("moods").select("emoji, label, trigger, helped, created_at").eq("user_id", userId).gte("created_at", since.toISOString()).order("created_at", { ascending: false }).limit(30),
            supabase.from("journals").select("id, created_at").eq("user_id", userId).gte("created_at", since.toISOString()),
          ]);

          const moods = moodRes.data || [];
          const journalCount = journalRes.data?.length || 0;
          const moodCounts: Record<string, number> = {};
          moods.forEach((m) => { moodCounts[m.label] = (moodCounts[m.label] || 0) + 1; });

          const topMoods = Object.entries(moodCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k} (${v})`).join(", ");
          const triggers = [...new Set(moods.filter((m) => m.trigger).map((m) => m.trigger))];
          const helped = [...new Set(moods.filter((m) => m.helped).map((m) => m.helped))];

          result = `${input.period}: ${moods.length} moods, ${journalCount} journals. Top: ${topMoods || "none"}.`;
          if (triggers.length > 0) result += ` Triggers: ${triggers.slice(0, 3).join(", ")}.`;
          if (helped.length > 0) result += ` Helped: ${helped.slice(0, 3).join(", ")}.`;
          result += " Give a brief, warm insight and one suggestion.";
          actions.push({ tool: block.name, result });
        }

        if (block.name === "create_task" && userId && accessToken) {
          if (!input.title || !input.dueDate) {
            result = "Need a title and date to create a task.";
          } else {
            const supabase = getSupabase(accessToken);
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
            const dueDateTime = input.dueTime
              ? `${input.dueDate}T${input.dueTime}:00`
              : `${input.dueDate}T12:00:00`;

            const { error } = await supabase.from("tasks").insert({
              id: `task_v1_${crypto.randomUUID()}`,
              user_id: userId,
              title: encrypt(input.title),
              due_date: dueDateTime,
              schedule_type: "once",
              duration: input.duration ? parseInt(String(input.duration)) : null,
            });

            if (error) {
              result = `Failed to create task: ${error.message}`;
            } else {
              const dateLabel = new Date(dueDateTime).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
              const timeLabel = input.dueTime || "12:00 PM";
              result = `✅ Added to calendar: "${input.title}" on ${dateLabel} at ${timeLabel}`;
            }
          }
          actions.push({ tool: "create_task", result });
        }

        if (block.name === "get_calendar" && userId && accessToken) {
          const supabase = getSupabase(accessToken);
          const todayDate = new Date().toISOString().split("T")[0];

          const { data: taskData, error: taskError } = await supabase
            .from("tasks")
            .select("title, due_date, schedule_type, schedule_rule, duration, completed")
            .eq("user_id", userId);

          if (taskError) { result = `Error: ${taskError.message}`; actions.push({ tool: "get_calendar", result }); break; }

          // Filter out completed
          const activeTasks = (taskData || []).filter((t) => !t.completed);

          const decryptedTasks = activeTasks.map((t) => ({ ...t, title: t.title ? decrypt(t.title) : t.title }));

          const scheduled: string[] = [];
          const habits: string[] = [];

          for (const t of decryptedTasks) {
            if (t.due_date) {
              const dueDate = t.due_date.split("T")[0];
              if (input.period === "today" && dueDate === todayDate) {
                scheduled.push(t.title);
              } else if (input.period === "week" || input.period === "month") {
                const due = new Date(t.due_date);
                const rangeEnd = new Date();
                rangeEnd.setDate(rangeEnd.getDate() + (input.period === "month" ? 30 : 7));
                if (due <= rangeEnd) {
                  const dayLabel = new Date(t.due_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
                  scheduled.push(`${t.title} (${dayLabel})`);
                }
              }
            }
            if (t.schedule_type === "habit" && t.schedule_rule) {
              const freq = (t.schedule_rule as { freq?: string }).freq;
              const time = (t.schedule_rule as { time?: string }).time || "";
              habits.push(`${t.title} — ${freq || "recurring"}${time ? ` at ${time}` : ""}${t.duration ? ` · ${t.duration}m` : ""}`);
            }
          }

          const parts: string[] = [];
          if (scheduled.length > 0) parts.push(`Scheduled:\n${scheduled.map((s, i) => `${i + 1}. ${s}`).join("\n")}`);
          if (habits.length > 0) parts.push(`Habits:\n${habits.map((h, i) => `${i + 1}. ${h}`).join("\n")}`);

          const periodLabel = input.period === "today" ? "Today" : input.period === "week" ? "This week" : "This month";
          result = parts.length > 0
            ? `${periodLabel}:\n${parts.join("\n\n")}`
            : `No items for ${periodLabel.toLowerCase()}. You have ${decryptedTasks.length} total tasks (${decryptedTasks.filter(t => t.due_date).length} with dates, ${decryptedTasks.filter(t => t.schedule_type === "habit").length} habits, ${decryptedTasks.filter(t => t.completed).length} completed).`;
          actions.push({ tool: "get_calendar", result });
        }

        if (block.name === "get_weather") {
          try {
            const loc = encodeURIComponent(input.location);
            const res = await fetch(`https://wttr.in/${loc}?format=j1`);
            if (res.ok) {
              const data = await res.json();
              const current = data.current_condition?.[0];
              if (current) {
                const tempC = current.temp_C;
                const tempF = current.temp_F;
                const desc = current.weatherDesc?.[0]?.value || "";
                const humidity = current.humidity;
                const feelsLikeF = current.FeelsLikeF;
                result = `${input.location}: ${desc}, ${tempF}°F (${tempC}°C), feels like ${feelsLikeF}°F, humidity ${humidity}%`;
              } else {
                result = "Couldn't get weather data.";
              }
            } else {
              result = "Couldn't get weather for that location.";
            }
          } catch {
            result = "Weather service unavailable.";
          }
          actions.push({ tool: "get_weather", result });
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

        // Catch-all: tool was called but no handler matched (e.g., user not logged in)
        if (!result) {
          if (!userId) {
            result = "You need to be signed in to use this feature. Please sign in first.";
          } else {
            result = "I couldn't complete that action. Please try again.";
          }
          actions.push({ tool: block.name, result });
        }
      }
    }

    // For reviews/insights: check for existing saved review first, then AI call if none
    const reviewAction = actions.find((a) => a.tool === "get_review" || a.tool === "get_insight");
    if (reviewAction && userId && accessToken && response.stop_reason === "tool_use") {
      try {
        const today = new Date().toISOString().split("T")[0];
        const supabaseCheck = getSupabase(accessToken);
        const { data: existing } = await supabaseCheck
          .from("saved_insights")
          .select("content")
          .eq("id", `review_${userId}_${today}`)
          .single();

        if (existing?.content) {
          textResponse = existing.content;
        } else {
        const toolBlock = response.content.find((b) => b.type === "tool_use" && (b.name === "get_review" || b.name === "get_insight")) as Anthropic.ToolUseBlock | undefined;
        if (toolBlock) {
          const followUp = await client.messages.create({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 300,
            system: AUTH_PROMPT,
            messages: [
              ...messages,
              { role: "assistant", content: response.content },
              { role: "user", content: [{ type: "tool_result", tool_use_id: toolBlock.id, content: reviewAction.result }] },
            ],
          });
          const followUpText = followUp.content.find((b) => b.type === "text");
          if (followUpText?.text) {
            textResponse = followUpText.text;
            // Save to saved_insights table
            const supabase = getSupabase(accessToken);
            await supabase.from("saved_insights").insert({
              id: `review_${userId}_${today}`,
              user_id: userId,
              content: textResponse,
              period: "week",
              data_date: today,
              lang: "en",
            });
          }
        }
        } // close else (no existing review)
      } catch {
        // Fall through to action summary
      }
    }

    // For other actions: use summary directly
    if (actions.length > 0 && !textResponse) {
      textResponse = actions.map((a) => a.result).join(". ");
    }

    // Log usage
    if (process.env.SUPABASE_SERVICE_KEY) {
      try {
        const adminDb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
        await adminDb.from("agent_usage").insert({
          user_id: userId,
          action: "chat",
          tool_used: actions.length > 0 ? actions.map((a) => a.tool).join(",") : null,
          ip,
        });
      } catch { /* don't block response */ }
    }

    return NextResponse.json({
      response: textResponse || "I'm here to help! What would you like to do?",
      actions: actions.map((a) => a.tool),
    });
  } catch (err) {
    console.error("support-chat error:", err);
    return NextResponse.json({ error: "Failed to respond" }, { status: 500 });
  }
}
