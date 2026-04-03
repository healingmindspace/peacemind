import { createBrowserClient } from "@supabase/ssr";
import { type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";

function getCookieDomain(): string | undefined {
  try {
    if (typeof window !== "undefined" && window.location.hostname.endsWith(".peacemind.app")) {
      return ".peacemind.app";
    }
    if (typeof window !== "undefined" && window.location.hostname === "peacemind.app") {
      return ".peacemind.app";
    }
  } catch {}
  return undefined;
}

const domain = getCookieDomain();

let client: SupabaseClient | null = null;

export function createClient(): SupabaseClient {
  if (client) return client;
  client = createBrowserClient(SUPABASE_URL, SUPABASE_KEY, {
    cookieOptions: {
      ...(domain ? { domain } : {}),
      path: "/",
      sameSite: "lax" as const,
      secure: true,
    },
  });
  return client;
}
