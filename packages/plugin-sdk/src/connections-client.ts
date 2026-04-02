"use client";

import { useState, useCallback, useEffect } from "react";
import type { ExternalConnection } from "./types";

// --- PKCE helpers (shared across all OAuth connections) ---

function generateRandomString(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const values = crypto.getRandomValues(new Uint8Array(length));
  for (let i = 0; i < length; i++) {
    result += chars[values[i] % chars.length];
  }
  return result;
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  return crypto.subtle.digest("SHA-256", encoder.encode(plain));
}

function base64urlencode(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// --- Storage keys ---

function storageKey(connectionId: string, suffix: string): string {
  return `pm-conn:${connectionId}:${suffix}`;
}

// --- OAuth flow ---

/**
 * Initiate the OAuth authorization flow for a connection.
 * Handles PKCE challenge generation and redirect.
 */
async function startOAuthFlow(
  connection: ExternalConnection,
  clientId: string
): Promise<void> {
  if (typeof window === "undefined") return;

  const redirectUri = `${window.location.origin}/auth/connect/${connection.id}/callback`;

  const params: Record<string, string> = {
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: connection.scopes.join(" "),
  };

  // PKCE flow — generate verifier and challenge
  if (connection.provider.type === "oauth2-pkce") {
    const verifier = generateRandomString(128);
    const challenge = base64urlencode(await sha256(verifier));
    localStorage.setItem(storageKey(connection.id, "verifier"), verifier);
    params.code_challenge_method = "S256";
    params.code_challenge = challenge;
  }

  // Server flow — request offline access for refresh token
  if (connection.provider.type === "oauth2-server") {
    params.access_type = "offline";
    params.prompt = "consent";
  }

  const url = `${connection.provider.authorizeUrl}?${new URLSearchParams(params)}`;

  // PWA-aware redirect
  const isPWA =
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator &&
      (window.navigator as unknown as { standalone: boolean }).standalone);

  if (isPWA) {
    window.open(url, "_blank");
  } else {
    window.location.href = url;
  }
}

/**
 * Complete the OAuth callback — exchange code for tokens via server.
 * Called from the universal callback page.
 */
export async function completeOAuthCallback(
  connectionId: string,
  code: string
): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const verifier = localStorage.getItem(storageKey(connectionId, "verifier"));
  const redirectUri = `${window.location.origin}/auth/connect/${connectionId}/callback`;

  const res = await fetch("/api/connections/exchange", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      connectionId,
      code,
      codeVerifier: verifier || undefined,
      redirectUri,
    }),
  });

  // Clean up verifier
  localStorage.removeItem(storageKey(connectionId, "verifier"));

  return res.ok;
}

// --- React hook ---

export interface UseConnectionResult {
  /** Whether the connection is active */
  isConnected: boolean;
  /** Whether we're checking connection status */
  loading: boolean;
  /** Start the OAuth flow to connect */
  connect: () => Promise<void>;
  /** Disconnect and revoke tokens */
  disconnect: () => Promise<void>;
}

/**
 * Hook for managing an external connection from a client component.
 *
 * @example
 * const spotify = useConnection("spotify", spotifyConnectionConfig, clientId);
 * // spotify.isConnected, spotify.connect(), spotify.disconnect()
 */
export function useConnection(
  connection: ExternalConnection,
  clientId: string
): UseConnectionResult {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check connection status on mount
  useEffect(() => {
    fetch(`/api/connections/status?connectionId=${connection.id}`)
      .then((res) => res.json())
      .then((data) => setIsConnected(data.connected))
      .catch(() => setIsConnected(false))
      .finally(() => setLoading(false));
  }, [connection.id]);

  const connect = useCallback(async () => {
    await startOAuthFlow(connection, clientId);
  }, [connection, clientId]);

  const disconnect = useCallback(async () => {
    const res = await fetch("/api/connections/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ connectionId: connection.id }),
    });
    if (res.ok) setIsConnected(false);
  }, [connection.id]);

  return { isConnected, loading, connect, disconnect };
}
