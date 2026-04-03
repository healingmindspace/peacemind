import { NextResponse } from "next/server";
import { getSupabase, getAuthenticatedUserId } from "@/lib/api-utils";
import { checkRateLimit, rateLimitResponse, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";

const INVITER_REWARD = 50;
const INVITED_REWARD = 20;

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!checkRateLimit(`invite:${ip}`, RATE_LIMITS.auth.limit, RATE_LIMITS.auth.windowMs)) {
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

  // GET — get or create invite code
  if (action === "get") {
    // Check if user already has an invite code
    const { data: existing } = await supabase
      .from("invites")
      .select("code, uses")
      .eq("inviter_id", userId)
      .single();

    if (existing) {
      return NextResponse.json({ code: existing.code, uses: existing.uses });
    }

    // Generate a short unique code
    const code = userId.slice(0, 4) + Math.random().toString(36).slice(2, 6);

    await supabase.from("invites").insert({
      inviter_id: userId,
      code,
      uses: 0,
    });

    return NextResponse.json({ code, uses: 0 });
  }

  // REDEEM — new user redeems an invite code on signup
  if (action === "redeem") {
    const { code } = body;
    if (!code) {
      return NextResponse.json({ error: "Missing code" }, { status: 400 });
    }

    // Find the invite
    const { data: invite } = await supabase
      .from("invites")
      .select("inviter_id, uses")
      .eq("code", String(code).trim().toLowerCase())
      .single();

    if (!invite) {
      return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
    }

    // Don't let user redeem their own code
    if (invite.inviter_id === userId) {
      return NextResponse.json({ error: "Cannot use own invite" }, { status: 400 });
    }

    // Check if this user already redeemed an invite
    const { data: alreadyRedeemed } = await supabase
      .from("invite_redemptions")
      .select("id")
      .eq("invited_id", userId)
      .limit(1);

    if (alreadyRedeemed && alreadyRedeemed.length > 0) {
      return NextResponse.json({ error: "Already redeemed an invite" }, { status: 400 });
    }

    // Record redemption
    await supabase.from("invite_redemptions").insert({
      inviter_id: invite.inviter_id,
      invited_id: userId,
      code: String(code).trim().toLowerCase(),
    });

    // Increment invite uses
    await supabase
      .from("invites")
      .update({ uses: invite.uses + 1 })
      .eq("inviter_id", invite.inviter_id);

    // Award seeds to inviter
    const { data: inviterBalance } = await supabase
      .from("seed_balances")
      .select("balance")
      .eq("user_id", invite.inviter_id)
      .single();

    await supabase.from("seed_balances").upsert({
      user_id: invite.inviter_id,
      balance: (inviterBalance?.balance ?? 0) + INVITER_REWARD,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    await supabase.from("seed_history").insert({
      user_id: invite.inviter_id,
      action: "invite_sent",
      amount: INVITER_REWARD,
    });

    // Award seeds to invited user
    const { data: invitedBalance } = await supabase
      .from("seed_balances")
      .select("balance")
      .eq("user_id", userId)
      .single();

    await supabase.from("seed_balances").upsert({
      user_id: userId,
      balance: (invitedBalance?.balance ?? 0) + INVITED_REWARD,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    await supabase.from("seed_history").insert({
      user_id: userId,
      action: "invite_welcome",
      amount: INVITED_REWARD,
    });

    return NextResponse.json({
      redeemed: true,
      inviterReward: INVITER_REWARD,
      invitedReward: INVITED_REWARD,
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
