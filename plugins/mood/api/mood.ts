import { NextResponse } from "next/server";
import { encrypt, decrypt } from "@/lib/server-encrypt";
import { getSupabase, getAuthenticatedUserId, MAX_LENGTHS } from "@/lib/api-utils";
import { checkRateLimit, rateLimitResponse, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!checkRateLimit(`mood:${ip}`, RATE_LIMITS.crud.limit, RATE_LIMITS.crud.windowMs)) {
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

  // INSERT — encrypt trigger + helped
  if (action === "insert") {
    const { emoji, label, trigger, helped, createdAt, photoPath } = body;
    const safeTrigger = trigger?.slice(0, MAX_LENGTHS.trigger) || null;
    const safeHelped = helped?.slice(0, MAX_LENGTHS.helped) || null;

    const insertData: Record<string, unknown> = {
      user_id: userId,
      emoji: emoji?.slice(0, 10),
      label: label?.slice(0, 50),
      trigger: safeTrigger ? encrypt(safeTrigger) : null,
      helped: safeHelped ? encrypt(safeHelped) : null,
    };
    if (createdAt) insertData.created_at = createdAt;
    if (photoPath) insertData.photo_path = photoPath;

    const { data, error } = await supabase
      .from("moods")
      .insert(insertData)
      .select("id")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ id: data.id });
  }

  // UPDATE — edit trigger and helped
  if (action === "update") {
    const { id, trigger, helped } = body;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const updates: Record<string, unknown> = {};
    if (trigger !== undefined) updates.trigger = trigger ? encrypt(trigger) : null;
    if (helped !== undefined) updates.helped = helped ? encrypt(helped) : null;
    const { error } = await supabase.from("moods").update(updates).eq("id", id).eq("user_id", userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // DELETE
  if (action === "delete") {
    const { id } = body;
    const { error } = await supabase.from("moods").delete().eq("id", id).eq("user_id", userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // LIST — decrypt trigger + helped + response
  if (action === "list") {
    const { since, limit, offset } = body;
    const pageSize = limit ? Math.min(limit, 200) : 10;
    const start = typeof offset === "number" ? offset : 0;
    let query = supabase
      .from("moods")
      .select("id, emoji, label, trigger, helped, response, photo_path, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (since) query = query.gte("created_at", since);
    query = query.range(start, start + pageSize);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = data || [];
    const hasMore = rows.length > pageSize;
    const page = hasMore ? rows.slice(0, pageSize) : rows;
    const decrypted = page.map((entry) => ({
      ...entry,
      trigger: entry.trigger ? decrypt(entry.trigger) : null,
      helped: entry.helped ? decrypt(entry.helped) : null,
      response: entry.response ? decrypt(entry.response) : null,
    }));

    return NextResponse.json({ data: decrypted, hasMore });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
