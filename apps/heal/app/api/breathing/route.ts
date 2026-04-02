import { getSupabase, getAuthenticatedUserId } from "@/lib/api-utils";
import { NextResponse } from "next/server";
import { checkRateLimit, rateLimitResponse, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!checkRateLimit(`breathing:${ip}`, RATE_LIMITS.crud.limit, RATE_LIMITS.crud.windowMs)) {
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
    const { method } = body;
    if (!method || typeof method !== "string") {
      return NextResponse.json({ error: "Missing method" }, { status: 400 });
    }
    const { error } = await supabase.from("breathing_sessions").insert({ user_id: userId, method: method.slice(0, 50) });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "list") {
    const { since, limit } = body;
    let query = supabase
      .from("breathing_sessions")
      .select("id, method, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (since) query = query.gte("created_at", since);
    if (limit) query = query.limit(limit);
    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: data || [] });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
