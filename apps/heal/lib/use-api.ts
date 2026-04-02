"use client";

import { useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { localFetch } from "@/lib/local-api";

/**
 * Hook that returns a fetch wrapper.
 * When anonymous: routes to local IndexedDB storage.
 * When authenticated: routes to server API as normal.
 */
export function useApi() {
  const { isAnonymous } = useAuth();

  const apiFetch = useCallback(
    async (url: string, opts?: RequestInit): Promise<Response> => {
      if (isAnonymous) {
        // Try local handler first
        let body: Record<string, unknown> = {};
        if (opts?.body) {
          try {
            body = JSON.parse(opts.body as string);
          } catch {
            // Not JSON — fall through to server
          }
        }

        const localResponse = await localFetch(url, body);
        if (localResponse) return localResponse;

        // No local handler — return a "not available offline" response
        return new Response(
          JSON.stringify({ error: "This feature requires an account" }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }

      // Authenticated — normal server fetch
      return fetch(url, opts);
    },
    [isAnonymous]
  );

  return { apiFetch, isAnonymous };
}
