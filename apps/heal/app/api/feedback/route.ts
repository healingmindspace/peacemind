import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabase, getAuthenticatedUserId } from "@/lib/api-utils";
import { checkRateLimit, rateLimitResponse, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!checkRateLimit(`feedback:${ip}`, 5, 60 * 60 * 1000)) {
    return rateLimitResponse();
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { message, subject, email, accessToken } = body;

  if (!message || typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }

  if (message.length > 2000) {
    return NextResponse.json({ error: "Message too long" }, { status: 400 });
  }

  let userId: string | null = null;
  let userEmail: string | null = email?.trim() || null;

  if (accessToken) {
    const userSupabase = getSupabase(accessToken);
    userId = await getAuthenticatedUserId(userSupabase);
    if (userId && !userEmail) {
      const { data: { user } } = await userSupabase.auth.getUser();
      userEmail = user?.email || null;
    }
  }

  // Use service role client to bypass RLS (feedback accepts anonymous submissions)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  const { data, error } = await supabase
    .from("feedback")
    .insert({
      user_id: userId,
      user_email: userEmail,
      subject: subject?.trim()?.slice(0, 200) || null,
      message: message.trim().slice(0, 2000),
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}
