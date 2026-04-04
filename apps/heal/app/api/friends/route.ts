import { NextResponse } from "next/server";
import { getSupabase, getAuthenticatedUserId } from "@/lib/api-utils";
import { TABLES } from "@/lib/tables";

export async function POST(request: Request) {
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

  if (action === "list") {
    const { data, error } = await supabase
      .from(TABLES.friendships)
      .select("*")
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
      .eq("status", "accepted");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
