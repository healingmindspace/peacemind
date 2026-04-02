import { getSupabase, getAuthenticatedUserId } from "@/lib/api-utils";
import { NextResponse } from "next/server";
import { checkRateLimit, rateLimitResponse, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!checkRateLimit(`assessments:${ip}`, RATE_LIMITS.crud.limit, RATE_LIMITS.crud.windowMs)) {
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

  // LIST — get assessment history
  if (action === "list") {
    const { type } = body;
    let query = supabase
      .from("assessments")
      .select("id, type, score, answers, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (type) query = query.eq("type", type);
    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: data || [] });
  }

  // INSERT — save assessment result
  if (action === "insert") {
    const { type, score, answers } = body;
    if (!type || score === undefined || !answers) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    if (!["phq9", "gad7"].includes(type)) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
    const { data, error } = await supabase
      .from("assessments")
      .insert({ user_id: userId, type, score: Math.min(Math.max(0, score), 30), answers })
      .select("id")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ id: data.id });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
