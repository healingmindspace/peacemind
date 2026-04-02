import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        domain: typeof window !== "undefined" && window.location.hostname.endsWith(".peacemind.app")
          ? ".peacemind.app"
          : undefined,
        path: "/",
        sameSite: "lax",
        secure: true,
      },
    }
  );
}
