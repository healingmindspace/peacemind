import { NextResponse } from "next/server";
import { decrypt } from "@/lib/server-encrypt";
import { getSupabase, getAuthenticatedUserId } from "@/lib/api-utils";
import { checkRateLimit, rateLimitResponse, getClientIp } from "@/lib/rate-limit";
import { TABLES, BUCKETS } from "@/lib/tables";

// Tight rate limit for destructive account operations
const ACCOUNT_RATE = { limit: 5, windowMs: 60 * 60 * 1000 };

// Which fields are encrypted per table
const ENCRYPTED_FIELDS: Record<string, string[]> = {
  [TABLES.moods]: ["trigger", "helped", "response"],
  [TABLES.journals]: ["content", "response"],
  [TABLES.goals]: ["name", "objective", "plan"],
  [TABLES.tasks]: ["description"],
  [TABLES.breathingSessions]: [],
  [TABLES.moodOptions]: [],
  [TABLES.assessments]: [],
  [TABLES.spotifyPlaylists]: [],
  [TABLES.dailyCheckins]: [],
};

// Tables that contain user data (excludes visits, feedback)
const USER_TABLES = [
  TABLES.moods,
  TABLES.journals,
  TABLES.goals,
  TABLES.tasks,
  TABLES.breathingSessions,
  TABLES.moodOptions,
  TABLES.assessments,
  TABLES.spotifyPlaylists,
  TABLES.dailyCheckins,
];

// Valid categories for delete-category
const VALID_CATEGORIES: Record<string, string> = {
  moods: TABLES.moods,
  journals: TABLES.journals,
  goals: TABLES.goals,
  tasks: TABLES.tasks,
  breathing: TABLES.breathingSessions,
  assessments: TABLES.assessments,
  photos: "photos",
};

function decryptRow(row: Record<string, unknown>, fields: string[]) {
  const result = { ...row };
  for (const field of fields) {
    if (result[field] && typeof result[field] === "string") {
      result[field] = decrypt(result[field] as string);
    }
  }
  return result;
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!checkRateLimit(`account:${ip}`, ACCOUNT_RATE.limit, ACCOUNT_RATE.windowMs)) {
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

  // EXPORT — fetch all user data, decrypt, return as JSON
  if (action === "export") {
    const exported: Record<string, unknown[]> = {};

    for (const table of USER_TABLES) {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq("user_id", userId);
      if (error) {
        exported[table] = [];
        continue;
      }
      const fields = ENCRYPTED_FIELDS[table] || [];
      exported[table] = (data || []).map((row) => {
        const decrypted = decryptRow(row, fields);
        delete decrypted.user_id;
        return decrypted;
      });
    }

    // Include photo file list
    const { data: photos } = await supabase.storage
      .from(BUCKETS.photos)
      .list(userId, { limit: 500 });
    exported.photos = (photos || [])
      .filter((f) => f.name !== ".emptyFolderPlaceholder")
      .map((f) => ({ name: f.name, created_at: f.created_at }));

    return NextResponse.json({
      exported_at: new Date().toISOString(),
      data: exported,
    });
  }

  // DELETE CATEGORY — delete all data in a specific category
  if (action === "delete-category") {
    const { category } = body;
    if (!category || !VALID_CATEGORIES[category]) {
      return NextResponse.json(
        { error: `Invalid category. Valid: ${Object.keys(VALID_CATEGORIES).join(", ")}` },
        { status: 400 }
      );
    }

    if (category === "photos") {
      const { data: files } = await supabase.storage
        .from(BUCKETS.photos)
        .list(userId, { limit: 500 });
      const paths = (files || [])
        .filter((f) => f.name !== ".emptyFolderPlaceholder")
        .map((f) => `${userId}/${f.name}`);
      if (paths.length > 0) {
        const { error } = await supabase.storage.from(BUCKETS.photos).remove(paths);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, deleted: "photos", count: paths.length });
    }

    const table = VALID_CATEGORIES[category];
    // Goals use soft delete to preserve journal references
    if (table === TABLES.goals) {
      const { data, error } = await supabase
        .from(table)
        .update({ deleted: true, active: false })
        .eq("user_id", userId)
        .select("id");
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, deleted: category, count: data?.length || 0 });
    }

    const { data, error } = await supabase
      .from(table)
      .delete()
      .eq("user_id", userId)
      .select("id");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, deleted: category, count: data?.length || 0 });
  }

  // DELETE ALL — delete all user data across all tables + storage
  if (action === "delete-all") {
    const results: Record<string, number> = {};

    for (const table of USER_TABLES) {
      if (table === TABLES.goals) {
        const { data } = await supabase
          .from(table)
          .update({ deleted: true, active: false })
          .eq("user_id", userId)
          .select("id");
        results[table] = data?.length || 0;
      } else {
        const { data } = await supabase
          .from(table)
          .delete()
          .eq("user_id", userId)
          .select("id");
        results[table] = data?.length || 0;
      }
    }

    // Delete all photos from storage
    const { data: files } = await supabase.storage
      .from(BUCKETS.photos)
      .list(userId, { limit: 500 });
    const paths = (files || [])
      .filter((f) => f.name !== ".emptyFolderPlaceholder")
      .map((f) => `${userId}/${f.name}`);
    if (paths.length > 0) {
      await supabase.storage.from(BUCKETS.photos).remove(paths);
    }
    results.photos = paths.length;

    return NextResponse.json({ ok: true, deleted: results });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
