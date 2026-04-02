import { NextResponse } from "next/server";
import { encrypt } from "@/lib/server-encrypt";
import { getSupabase, getAuthenticatedUserId, MAX_LENGTHS } from "@/lib/api-utils";
import { checkRateLimit, rateLimitResponse, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";

// Fields that need encryption per table
const ENCRYPTED_FIELDS: Record<string, string[]> = {
  moods: ["trigger", "helped", "response"],
  journals: ["content", "response"],
  goals: ["name", "objective", "plan"],
};

// Max rows per table to prevent abuse
const MAX_ROWS_PER_TABLE = 500;

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!checkRateLimit(`claim:${ip}`, 5, RATE_LIMITS.auth.windowMs)) {
    return rateLimitResponse();
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { data, accessToken } = body;

  if (!accessToken || !data || typeof data !== "object") {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const supabase = getSupabase(accessToken);
  const userId = await getAuthenticatedUserId(supabase);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, { migrated: number; errors: number }> = {};

  for (const [tableName, rows] of Object.entries(data)) {
    if (!Array.isArray(rows)) continue;

    const limited = rows.slice(0, MAX_ROWS_PER_TABLE);
    let migrated = 0;
    let errors = 0;

    for (const row of limited) {
      try {
        // Replace user_id with the real authenticated user
        const cleanRow: Record<string, unknown> = { ...row, user_id: userId };

        // Remove the local UUID id — let Supabase generate new ones
        delete cleanRow.id;

        // Encrypt sensitive fields
        const fieldsToEncrypt = ENCRYPTED_FIELDS[tableName] || [];
        for (const field of fieldsToEncrypt) {
          if (typeof cleanRow[field] === "string" && cleanRow[field]) {
            cleanRow[field] = encrypt(cleanRow[field] as string);
          }
        }

        // Truncate string fields for safety
        for (const [key, value] of Object.entries(cleanRow)) {
          if (typeof value === "string" && key !== "user_id" && key !== "created_at") {
            cleanRow[key] = (value as string).slice(0, MAX_LENGTHS.content);
          }
        }

        const { error } = await supabase.from(tableName).insert(cleanRow);
        if (error) {
          errors++;
        } else {
          migrated++;
        }
      } catch {
        errors++;
      }
    }

    results[tableName] = { migrated, errors };
  }

  return NextResponse.json({ ok: true, results });
}
