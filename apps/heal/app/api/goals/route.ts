import { getSupabase, getAuthenticatedUserId, MAX_LENGTHS } from "@/lib/api-utils";
import { NextResponse } from "next/server";
import { encrypt, decrypt } from "@/lib/server-encrypt";
import { checkRateLimit, rateLimitResponse, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!checkRateLimit(`goals:${ip}`, RATE_LIMITS.crud.limit, RATE_LIMITS.crud.windowMs)) {
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

  // INSERT
  if (action === "insert") {
    const { name, icon } = body;
    if (!name) return NextResponse.json({ error: "Missing name" }, { status: 400 });

    const { data: existing } = await supabase
      .from("goals")
      .select("sort_order")
      .eq("user_id", userId)
      .order("sort_order", { ascending: false })
      .limit(1);

    const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

    const { objective } = body;
    const insertData: Record<string, unknown> = {
      user_id: userId,
      name: encrypt(String(name).slice(0, MAX_LENGTHS.name)),
      icon: icon || "🌿",
      sort_order: nextOrder,
    };
    if (objective) insertData.objective = encrypt(String(objective).slice(0, MAX_LENGTHS.objective));

    const { data, error } = await supabase
      .from("goals")
      .insert(insertData)
      .select("id")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ id: data.id });
  }

  // LIST
  if (action === "list") {
    const { data, error } = await supabase
      .from("goals")
      .select("id, name, icon, sort_order, active, deleted, objective, plan, created_at")
      .eq("user_id", userId)
      .order("sort_order", { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const decrypted = (data || []).map((g) => ({
      ...g,
      name: decrypt(g.name),
      objective: g.objective ? decrypt(g.objective) : null,
      plan: g.plan ? decrypt(g.plan) : null,
    }));
    return NextResponse.json({ data: decrypted });
  }

  // UPDATE
  if (action === "update") {
    const { id, name, icon, active, deleted, objective } = body;
    const updates: Record<string, unknown> = {};
    if (name) updates.name = encrypt(String(name).slice(0, MAX_LENGTHS.name));
    if (icon) updates.icon = String(icon).slice(0, 10);
    if (active !== undefined) updates.active = active;
    if (deleted !== undefined) updates.deleted = deleted;
    if (objective !== undefined) updates.objective = objective ? encrypt(String(objective).slice(0, MAX_LENGTHS.objective)) : null;
    if (body.plan !== undefined) updates.plan = body.plan ? encrypt(String(body.plan).slice(0, MAX_LENGTHS.description)) : null;

    const { error } = await supabase.from("goals").update(updates).eq("id", id).eq("user_id", userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // DELETE (soft — marks as deleted, keeps row for journal references)
  if (action === "delete") {
    const { id } = body;
    const { error } = await supabase.from("goals").update({ deleted: true, active: false }).eq("id", id).eq("user_id", userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
