import { NextResponse } from "next/server";
import { getSupabase, getAuthenticatedUserId } from "@/lib/api-utils";
import { checkRateLimit, rateLimitResponse, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!checkRateLimit(`seeds:${ip}`, RATE_LIMITS.crud.limit, RATE_LIMITS.crud.windowMs)) {
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

  // GET — return balance + recent history
  if (action === "get") {
    const [balanceRes, historyRes] = await Promise.all([
      supabase
        .from("seed_balances")
        .select("balance")
        .eq("user_id", userId)
        .single(),
      supabase
        .from("seed_history")
        .select("action, amount, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    return NextResponse.json({
      balance: balanceRes.data?.balance ?? 0,
      history: historyRes.data ?? [],
    });
  }

  // AWARD — add seeds for an action (once per action per day)
  if (action === "award") {
    const { seedAction, amount } = body;
    if (!seedAction || !amount || amount <= 0) {
      return NextResponse.json({ error: "Missing seedAction or amount" }, { status: 400 });
    }

    const today = new Date().toISOString().split("T")[0];

    // Check if already awarded today (skip for streak milestones)
    if (!String(seedAction).startsWith("streak")) {
      const { data: existing } = await supabase
        .from("seed_history")
        .select("id")
        .eq("user_id", userId)
        .eq("action", seedAction)
        .gte("created_at", `${today}T00:00:00`)
        .limit(1);

      if (existing && existing.length > 0) {
        return NextResponse.json({ awarded: 0, reason: "already_awarded_today" });
      }
    }

    // Upsert balance
    const { data: currentBalance } = await supabase
      .from("seed_balances")
      .select("balance")
      .eq("user_id", userId)
      .single();

    const newBalance = (currentBalance?.balance ?? 0) + amount;

    await supabase
      .from("seed_balances")
      .upsert(
        { user_id: userId, balance: newBalance, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );

    // Log history
    await supabase
      .from("seed_history")
      .insert({ user_id: userId, action: seedAction, amount });

    return NextResponse.json({ awarded: amount, balance: newBalance });
  }

  // DEDUCT — remove seeds when content is deleted
  if (action === "deduct") {
    const { seedAction, amount } = body;
    if (!seedAction || !amount || amount <= 0) {
      return NextResponse.json({ error: "Missing seedAction or amount" }, { status: 400 });
    }

    const { data: currentBalance } = await supabase
      .from("seed_balances")
      .select("balance")
      .eq("user_id", userId)
      .single();

    const newBalance = Math.max(0, (currentBalance?.balance ?? 0) - amount);

    await supabase
      .from("seed_balances")
      .upsert(
        { user_id: userId, balance: newBalance, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );

    // Log history
    await supabase
      .from("seed_history")
      .insert({ user_id: userId, action: `delete-${seedAction}`, amount: -amount });

    return NextResponse.json({ deducted: amount, balance: newBalance });
  }

  // SYNC — migrate localStorage seeds to DB (one-time on first login)
  if (action === "sync") {
    const { localBalance, localHistory } = body;

    // Only sync if user has no DB balance yet
    const { data: existing } = await supabase
      .from("seed_balances")
      .select("balance")
      .eq("user_id", userId)
      .single();

    if (existing) {
      // Already has DB seeds — return DB values
      return NextResponse.json({ synced: false, balance: existing.balance });
    }

    // Migrate localStorage to DB
    const balance = Math.max(0, localBalance || 0);
    await supabase
      .from("seed_balances")
      .insert({ user_id: userId, balance });

    // Migrate history
    if (Array.isArray(localHistory) && localHistory.length > 0) {
      const rows = localHistory.slice(0, 100).map((entry: { action: string; amount: number; date: string }) => ({
        user_id: userId,
        action: entry.action,
        amount: entry.amount,
        created_at: entry.date,
      }));
      await supabase.from("seed_history").insert(rows);
    }

    return NextResponse.json({ synced: true, balance });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
