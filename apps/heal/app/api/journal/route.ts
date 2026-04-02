import { getSupabase, getAuthenticatedUserId, MAX_LENGTHS } from "@/lib/api-utils";
import { NextResponse } from "next/server";
import { encrypt, decrypt } from "@/lib/server-encrypt";
import { checkRateLimit, rateLimitResponse, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!checkRateLimit(`journal:${ip}`, RATE_LIMITS.crud.limit, RATE_LIMITS.crud.windowMs)) {
    return rateLimitResponse();
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { action, content, response, id, liked, createdAt, accessToken, goalId } = body;

  if (!action || !accessToken) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const supabase = getSupabase(accessToken);
  const userId = await getAuthenticatedUserId(supabase);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // INSERT — encrypt content
  if (action === "insert") {
    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "Missing content" }, { status: 400 });
    }
    const encrypted = encrypt(content.slice(0, MAX_LENGTHS.content));
    const insertData: Record<string, unknown> = { user_id: userId, content: encrypted };
    if (goalId) insertData.goal_id = goalId;
    if (body.parentId) insertData.parent_id = body.parentId;
    if (body.photoPath) insertData.photo_path = body.photoPath;
    if (createdAt) insertData.created_at = createdAt;
    const { data, error } = await supabase
      .from("journals")
      .insert(insertData)
      .select("id")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ id: data.id });
  }

  // UPDATE RESPONSE — encrypt response
  if (action === "update_response") {
    const encrypted = encrypt(response);
    const { error } = await supabase
      .from("journals")
      .update({ response: encrypted })
      .eq("id", id)
      .eq("user_id", userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // UPDATE CONTENT — encrypt new content, clear response
  if (action === "update_content") {
    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "Missing content" }, { status: 400 });
    }
    const encrypted = encrypt(content.slice(0, MAX_LENGTHS.content));
    const { error } = await supabase
      .from("journals")
      .update({ content: encrypted, response: null })
      .eq("id", id)
      .eq("user_id", userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // UPDATE LIKED
  if (action === "update_liked") {
    const { error } = await supabase
      .from("journals")
      .update({ liked })
      .eq("id", id)
      .eq("user_id", userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // DELETE
  if (action === "delete") {
    const { error } = await supabase
      .from("journals")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // LIST — decrypt content + response
  if (action === "list") {
    const { data, error } = await supabase
      .from("journals")
      .select("id, content, response, liked, goal_id, photo_path, parent_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const decrypted = (data || []).map((entry) => ({
      ...entry,
      content: decrypt(entry.content),
      response: entry.response ? decrypt(entry.response) : null,
    }));
    return NextResponse.json({ data: decrypted });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
