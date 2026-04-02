import { createBrowserClient } from "@supabase/ssr";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_KEY, {
    cookieOptions: {
      domain: typeof window !== "undefined" && window.location.hostname.endsWith(".peacemind.app")
        ? ".peacemind.app"
        : undefined,
      path: "/",
      sameSite: "lax",
      secure: true,
    },
  });
}
