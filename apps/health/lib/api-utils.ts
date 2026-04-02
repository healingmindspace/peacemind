import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export function getSupabase(authToken: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${authToken}` } } }
  );
}

export function parseBody(body: unknown): { action?: string; userId?: string; accessToken?: string; [key: string]: unknown } | null {
  if (!body || typeof body !== "object") return null;
  return body as { action?: string; userId?: string; accessToken?: string; [key: string]: unknown };
}

export function requireParams(body: Record<string, unknown>, ...keys: string[]): NextResponse | null {
  for (const key of keys) {
    if (!body[key]) {
      return NextResponse.json({ error: `Missing ${key}` }, { status: 400 });
    }
  }
  return null;
}

export function validateStringLength(value: string | undefined | null, maxLength: number): string | null {
  if (!value) return null;
  return value.slice(0, maxLength);
}

// Max lengths for user input
export const MAX_LENGTHS = {
  content: 5000,
  title: 500,
  description: 2000,
  trigger: 500,
  helped: 500,
  name: 200,
  objective: 1000,
} as const;

export async function getAuthenticatedUserId(supabase: SupabaseClient): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}
