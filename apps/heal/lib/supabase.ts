import { createBrowserClient } from "@supabase/ssr";

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

export function createClient() {
  const domain = getCookieDomain();
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      isSingleton: false,
      cookieOptions: {
        ...(domain ? { domain } : {}),
        path: "/",
        sameSite: "lax" as const,
        secure: true,
      },
    }
  );
}
