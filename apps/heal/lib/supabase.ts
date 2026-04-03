import { createBrowserClient, type CookieOptionsWithName } from "@supabase/ssr";
import { type SupabaseClient } from "@supabase/supabase-js";

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
  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        ...(domain ? { domain } : {}),
        path: "/",
        sameSite: "lax" as const,
        secure: true,
      },
    }
  );
  return client;
}
