import { NextResponse } from "next/server";
import { getSupabase, getAuthenticatedUserId } from "@/lib/api-utils";
import { TABLES } from "@/lib/tables";
import { randomUUID } from "crypto";

export async function POST(request: Request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { action, accessToken, code } = body;
  if (!accessToken || !action) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const supabase = getSupabase(accessToken);
  const userId = await getAuthenticatedUserId(supabase);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Create a new invite link
  if (action === "create") {
    const inviteCode = randomUUID().slice(0, 8);
    const { data, error } = await supabase
      .from(TABLES.friendInvites)
      .insert({
        id: `invite_v1_${randomUUID()}`,
        user_id: userId,
        code: inviteCode,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  }

  // Accept an invite by code
  if (action === "accept") {
    if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 });

    // Find the invite
    const { data: invite, error: inviteError } = await supabase
      .from(TABLES.friendInvites)
      .select("*")
      .eq("code", code)
      .is("used_by", null)
      .single();

    if (inviteError || !invite) {
      return NextResponse.json({ error: "Invalid or expired invite" }, { status: 404 });
    }

    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: "Invite expired" }, { status: 410 });
    }

    if (invite.user_id === userId) {
      return NextResponse.json({ error: "Cannot accept your own invite" }, { status: 400 });
    }

    // Check if already friends
    const { data: existing } = await supabase
      .from(TABLES.friendships)
      .select("id")
      .or(`and(user_id.eq.${userId},friend_id.eq.${invite.user_id}),and(user_id.eq.${invite.user_id},friend_id.eq.${userId})`)
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json({ error: "Already friends" }, { status: 409 });
    }

    // Mark invite as used
    await supabase
      .from(TABLES.friendInvites)
      .update({ used_by: userId })
      .eq("id", invite.id);

    // Create friendship
    const { data: friendship, error: friendError } = await supabase
      .from(TABLES.friendships)
      .insert({
        id: `friend_v1_${randomUUID()}`,
        user_id: invite.user_id,
        friend_id: userId,
        status: "accepted",
        accepted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (friendError) return NextResponse.json({ error: friendError.message }, { status: 500 });
    return NextResponse.json({ friendship }, { status: 201 });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
