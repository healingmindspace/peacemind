import { getSupabase, getAuthenticatedUserId, MAX_LENGTHS } from "@/lib/api-utils";
import { NextResponse } from "next/server";
import { encrypt, decrypt } from "@/lib/server-encrypt";
import { checkRateLimit, rateLimitResponse, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!checkRateLimit(`tasks:${ip}`, RATE_LIMITS.crud.limit, RATE_LIMITS.crud.windowMs)) {
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
    const { goalId, title, description, dueDate, scheduleType, scheduleRule, duration } = body;
    if (!title) return NextResponse.json({ error: "Missing title" }, { status: 400 });

    const insertData: Record<string, unknown> = {
      user_id: userId,
      goal_id: goalId || null,
      title: encrypt(String(title).slice(0, MAX_LENGTHS.title)),
      description: description ? encrypt(String(description).slice(0, MAX_LENGTHS.description)) : null,
      due_date: dueDate || null,
      schedule_type: scheduleType || "once",
      schedule_rule: scheduleRule || null,
      duration: duration || null,
    };

    const { data, error } = await supabase
      .from("tasks")
      .insert(insertData)
      .select("id")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ id: data.id });
  }

  // LIST
  if (action === "list") {
    const { goalId, filter } = body;

    let query = supabase
      .from("tasks")
      .select("id, goal_id, title, description, due_date, completed, completed_at, google_event_id, schedule_type, schedule_rule, duration, created_at")
      .eq("user_id", userId);

    if (goalId) query = query.eq("goal_id", goalId);

    if (filter === "completed") {
      query = query.eq("completed", true).order("completed_at", { ascending: false });
    } else if (filter === "upcoming") {
      query = query.eq("completed", false).order("due_date", { ascending: true, nullsFirst: false });
    } else {
      // Default: incomplete first sorted by due_date, then completed
      query = query.order("completed", { ascending: true }).order("due_date", { ascending: true, nullsFirst: false });
    }

    query = query.limit(100);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const decrypted = (data || []).map((t) => ({
      ...t,
      title: decrypt(t.title),
      description: t.description ? decrypt(t.description) : null,
    }));
    return NextResponse.json({ data: decrypted });
  }

  // UPDATE
  if (action === "update") {
    const { id, title, description, dueDate, goalId, scheduleType, scheduleRule, duration, googleEventId } = body;
    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = encrypt(String(title).slice(0, MAX_LENGTHS.title));
    if (description !== undefined) updates.description = description ? encrypt(String(description).slice(0, MAX_LENGTHS.description)) : null;
    if (dueDate !== undefined) updates.due_date = dueDate || null;
    if (scheduleType !== undefined) updates.schedule_type = scheduleType;
    if (scheduleRule !== undefined) updates.schedule_rule = scheduleRule;
    if (duration !== undefined) updates.duration = duration || null;
    if (goalId !== undefined) updates.goal_id = goalId || null;
    if (googleEventId !== undefined) updates.google_event_id = googleEventId;

    const { error } = await supabase.from("tasks").update(updates).eq("id", id).eq("user_id", userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // TOGGLE COMPLETE
  if (action === "toggle_complete") {
    const { id, completed } = body;
    const updates: Record<string, unknown> = {
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    };

    const { error } = await supabase.from("tasks").update(updates).eq("id", id).eq("user_id", userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // DELETE
  if (action === "delete") {
    const { id } = body;
    const { error } = await supabase.from("tasks").delete().eq("id", id).eq("user_id", userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
