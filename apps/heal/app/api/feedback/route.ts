import { NextResponse } from "next/server";
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

  // Use admin client for anonymous submissions, user client for authenticated
  const supabase = getSupabase(accessToken || process.env.SUPABASE_SERVICE_KEY || "");

  let userId: string | null = null;
  let userEmail: string | null = email?.trim() || null;

  if (accessToken) {
    userId = await getAuthenticatedUserId(supabase);
    if (userId && !userEmail) {
      const { data: { user } } = await supabase.auth.getUser();
      userEmail = user?.email || null;
    }
  }

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
