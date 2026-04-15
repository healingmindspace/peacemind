import { getSupabase, getAuthenticatedUserId, MAX_LENGTHS } from "@/lib/api-utils";
import { NextResponse } from "next/server";
import { checkRateLimit, rateLimitResponse, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!checkRateLimit(`mood-options:${ip}`, RATE_LIMITS.crud.limit, RATE_LIMITS.crud.windowMs)) {
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

  // LIST
  if (action === "list") {
    const { data, error } = await supabase
      .from("mood_options")
      .select("id, type, label, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: data || [] });
  }

  // INSERT
  if (action === "insert") {
    const { type, label } = body;
    if (!type || !label || !["trigger", "helped", "hidden_trigger", "hidden_helped", "emoji"].includes(type)) {
      return NextResponse.json({ error: "Missing type or label" }, { status: 400 });
    }
    const safeLabel = String(label).slice(0, MAX_LENGTHS.name);

    // Prevent duplicates
    const { data: existing } = await supabase
      .from("mood_options")
      .select("id")
      .eq("user_id", userId)
      .eq("type", type)
      .eq("label", safeLabel)
      .limit(1);
    if (existing && existing.length > 0) {
      return NextResponse.json({ id: existing[0].id });
    }

    const { data, error } = await supabase
      .from("mood_options")
      .insert({ user_id: userId, type, label: safeLabel })
      .select("id")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ id: data.id });
  }

  // DELETE
  if (action === "delete") {
    const { id } = body;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const { error } = await supabase
      .from("mood_options")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
