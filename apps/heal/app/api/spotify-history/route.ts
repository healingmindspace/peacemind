import { getSupabase, getAuthenticatedUserId } from "@/lib/api-utils";
import { NextResponse } from "next/server";
import { checkRateLimit, rateLimitResponse, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!checkRateLimit(`spotify-history:${ip}`, RATE_LIMITS.crud.limit, RATE_LIMITS.crud.windowMs)) {
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

  if (action === "list") {
    const { data, error } = await supabase
      .from("spotify_playlists")
      .select("id, spotify_url, spotify_type, spotify_id, name, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: data || [] });
  }

  if (action === "insert") {
    const { spotifyUrl, spotifyType, spotifyId, name } = body;
    if (!spotifyUrl || !spotifyId) {
      return NextResponse.json({ error: "Missing spotify fields" }, { status: 400 });
    }
    const { error } = await supabase.from("spotify_playlists").insert({
      user_id: userId,
      spotify_url: String(spotifyUrl).slice(0, 500),
      spotify_type: String(spotifyType || "").slice(0, 50),
      spotify_id: String(spotifyId).slice(0, 200),
      name: name ? String(name).slice(0, 200) : null,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "delete") {
    const { spotifyId } = body;
    const { error } = await supabase
      .from("spotify_playlists")
      .delete()
      .eq("user_id", userId)
      .eq("spotify_id", spotifyId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
