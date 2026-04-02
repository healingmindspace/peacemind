import { getSupabase, getAuthenticatedUserId } from "@/lib/api-utils";
import { NextResponse } from "next/server";
import { checkRateLimit, rateLimitResponse, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!checkRateLimit(`feedback-check:${ip}`, RATE_LIMITS.crud.limit, RATE_LIMITS.crud.windowMs)) {
    return rateLimitResponse();
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { accessToken, lastSeen } = body;
  if (!accessToken) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const supabase = getSupabase(accessToken);
  const userId = await getAuthenticatedUserId(supabase);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("feedback")
    .select("id")
    .eq("user_id", userId)
    .not("reply", "is", null)
    .gt("replied_at", lastSeen || "2000-01-01");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ unreadCount: data?.length || 0 });
}
