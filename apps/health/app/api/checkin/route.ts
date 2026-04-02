import { getSupabase, getAuthenticatedUserId } from "@/lib/api-utils";
import { NextResponse } from "next/server";
import { checkRateLimit, rateLimitResponse, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!checkRateLimit(`checkin:${ip}`, RATE_LIMITS.crud.limit, RATE_LIMITS.crud.windowMs)) {
    return rateLimitResponse();
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { action, accessToken } = body;
  if (!accessToken || !action) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const supabase = getSupabase(accessToken);
  const userId = await getAuthenticatedUserId(supabase);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (action === "insert") {
    const { energy, pain, sleep, notes } = body;
    const { data, error } = await supabase
      .from("daily_checkins")
      .insert({ user_id: userId, energy, pain, sleep_quality: sleep, notes })
      .select("id")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ id: data.id });
  }

  if (action === "list") {
    const { since, limit } = body;
    let query = supabase
      .from("daily_checkins")
      .select("id, energy, pain, sleep_quality, notes, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (since) query = query.gte("created_at", since);
    if (limit) query = query.limit(Math.min(limit, 100));
    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: data || [] });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
