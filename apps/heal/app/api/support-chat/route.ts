import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { checkRateLimit, rateLimitResponse, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";
import { createClient } from "@supabase/supabase-js";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are Peacemind's friendly support assistant. You help users understand and use the Peacemind wellness app. Be warm, concise, and helpful. Answer in the same language the user writes in (English or Chinese).

## App Features

**Mood Tab (😊)**
- Tap an emoji to log how you're feeling
- Add what triggered your mood and what helped
- View mood history (week/month/quarter)
- Mood chart shows patterns over time

**Calm Tab (🍃)**
- Breathing exercises: 4-7-8, Box Breathing, Calm Breathing
- 5-4-3-2-1 Grounding exercise for anxiety
- Self-assessments: PHQ-9 (depression) and GAD-7 (anxiety) — same tools therapists use
- Learn section: articles about anxiety, depression, coping, brain science

**Grow Tab (🌱)**
- Create paths (goals) like School, Work, Life, Exercise
- AI planning: describe your objective and Peacemind suggests steps
- Weekly calendar view (week or month)
- Journal: write entries, upload photos, extract text from images
- Associate journal entries with paths using 🔗
- Plan from journal entries using 🌱

**Me Tab (👤)**
- Seeds: earn seeds by logging moods, journaling, breathing, streaks
- View seed history and streak count
- Seed shop coming soon
- Quick overview of wellness topics

**General**
- Bilingual: English and Chinese (toggle in settings)
- All journal entries and mood data are encrypted (AES-256)
- No trackers, no ads, no data selling
- Works offline as a PWA (Add to Home Screen)
- Backfill past days for mood and journal
- Anonymous feedback on the About page

**Common Questions**
- "How do I change language?" → Tap the language toggle (EN/中) at the top of the app
- "Is my data private?" → Yes. All journals and mood triggers are encrypted. We cannot read your data.
- "How do seeds work?" → You earn seeds by logging moods, journaling, breathing, and maintaining streaks. Seeds will unlock avatar items in the future.
- "Can I delete my data?" → Yes. Go to Me tab → About → you can delete specific categories or all data.
- "How do I set a reminder?" → Currently there are no push notifications. We recommend setting a daily phone alarm as a reminder to check in.

## Rules
- Keep answers short (2-4 sentences max)
- If the user reports a bug or requests a feature, acknowledge it warmly and say you'll pass it along
- If you don't know something, say "I'm not sure about that — try the feedback form on the About page and the team will get back to you"
- Never make up features that don't exist
- Be encouraging about their wellness journey`;

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

  const { message, history, feedback } = body;
  if (!message?.trim()) {
    return NextResponse.json({ error: "Missing message" }, { status: 400 });
  }

  // If flagged as feedback, save to DB
  if (feedback && process.env.SUPABASE_SERVICE_KEY) {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY!,
      );
      await supabase.from("feedback").insert({
        message: message.trim().slice(0, 2000),
        subject: "Support Chat",
      });
    } catch { /* ignore */ }
  }

  const messages = [
    ...(Array.isArray(history) ? history.slice(-10) : []),
    { role: "user" as const, content: message.trim() },
  ];

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages,
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    return NextResponse.json({ response: text });
  } catch {
    return NextResponse.json({ error: "Failed to respond" }, { status: 500 });
  }
}
