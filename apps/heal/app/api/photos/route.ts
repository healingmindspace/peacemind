import { getSupabase, getAuthenticatedUserId } from "@/lib/api-utils";
import { NextResponse } from "next/server";
import { checkRateLimit, rateLimitResponse, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!checkRateLimit(`photos:${ip}`, RATE_LIMITS.crud.limit, RATE_LIMITS.crud.windowMs)) {
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

  // GET SIGNED URL
  if (action === "signedUrl") {
    const { path } = body;
    if (!path || !String(path).startsWith(userId + "/")) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }
    const { data, error } = await supabase.storage.from("photos").createSignedUrl(path, 3600);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ signedUrl: data.signedUrl });
  }

  // BATCH SIGNED URLS
  if (action === "signedUrls") {
    const { paths } = body;
    if (!Array.isArray(paths)) return NextResponse.json({ error: "Invalid paths" }, { status: 400 });
    const validPaths = paths.filter((p: string) => String(p).startsWith(userId + "/")).slice(0, 50);
    const urls: Record<string, string> = {};
    for (const path of validPaths) {
      const { data } = await supabase.storage.from("photos").createSignedUrl(path, 3600);
      if (data?.signedUrl) urls[path] = data.signedUrl;
    }
    return NextResponse.json({ urls });
  }

  // UPLOAD (base64)
  if (action === "upload") {
    const { fileName, base64Data, contentType } = body;
    if (!fileName || !base64Data) return NextResponse.json({ error: "Missing file data" }, { status: 400 });
    const path = `${userId}/${fileName}`;
    const buffer = Buffer.from(base64Data, "base64");
    const { error } = await supabase.storage.from("photos").upload(path, buffer, { contentType: contentType || "image/jpeg" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ path });
  }

  // LIST — list user's files
  if (action === "list") {
    const { data, error } = await supabase.storage
      .from("photos")
      .list(userId, { limit: 50, sortBy: { column: "created_at", order: "desc" } });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const files = (data || []).filter((f) => f.name !== ".emptyFolderPlaceholder");
    return NextResponse.json({ data: files });
  }

  // DELETE MULTIPLE
  if (action === "deleteMany") {
    const { paths } = body;
    if (!Array.isArray(paths)) return NextResponse.json({ error: "Invalid paths" }, { status: 400 });
    const validPaths = paths.filter((p: string) => String(p).startsWith(userId + "/")).slice(0, 50);
    if (validPaths.length === 0) return NextResponse.json({ ok: true });
    const { error } = await supabase.storage.from("photos").remove(validPaths);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // DELETE
  if (action === "delete") {
    const { path } = body;
    if (!path || !String(path).startsWith(userId + "/")) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }
    const { error } = await supabase.storage.from("photos").remove([path]);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
