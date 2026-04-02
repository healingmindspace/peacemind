import {
  getSupabase,
  encrypt,
  decrypt,
  TABLES,
} from "@peacemind/lib";
import type { ExternalConnection, PluginConfig, PluginConnectionsSDK } from "./types";

const CONNECTIONS_TABLE = TABLES.pluginConnections;

// --- Helpers ---

function getConnectionConfig(config: PluginConfig, connectionId: string): ExternalConnection {
  const conn = config.connections?.find((c) => c.id === connectionId);
  if (!conn) {
    throw new Error(
      `Plugin "${config.id}" does not declare connection "${connectionId}". ` +
      `Declared connections: ${(config.connections ?? []).map((c) => c.id).join(", ")}`
    );
  }
  return conn;
}

function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Environment variable "${name}" is required but not set`);
  }
  return value;
}

// --- Token exchange ---

async function exchangeAuthorizationCode(
  conn: ExternalConnection,
  code: string,
  codeVerifier?: string,
  redirectUri?: string
): Promise<{ access_token: string; refresh_token?: string; expires_in?: number }> {
  const clientId = getEnvVar(conn.provider.clientIdEnvVar);

  const params: Record<string, string> = {
    grant_type: "authorization_code",
    code,
    client_id: clientId,
  };

  if (redirectUri) {
    params.redirect_uri = redirectUri;
  }

  // PKCE flow — code verifier instead of client secret
  if (conn.provider.type === "oauth2-pkce" && codeVerifier) {
    params.code_verifier = codeVerifier;
  }

  // Server flow — client secret required
  if (conn.provider.type === "oauth2-server" && conn.provider.clientSecretEnvVar) {
    params.client_secret = getEnvVar(conn.provider.clientSecretEnvVar);
  }

  const res = await fetch(conn.provider.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Token exchange failed for "${conn.id}": ${error}`);
  }

  return res.json();
}

async function refreshAccessToken(
  conn: ExternalConnection,
  refreshToken: string
): Promise<{ access_token: string; refresh_token?: string; expires_in?: number }> {
  const clientId = getEnvVar(conn.provider.clientIdEnvVar);

  const params: Record<string, string> = {
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
  };

  if (conn.provider.clientSecretEnvVar) {
    params.client_secret = getEnvVar(conn.provider.clientSecretEnvVar);
  }

  const res = await fetch(conn.provider.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });

  if (!res.ok) {
    throw new Error(`Token refresh failed for "${conn.id}"`);
  }

  return res.json();
}

// --- SDK factory ---

/**
 * Create the connections SDK for a plugin.
 * Handles OAuth token exchange, encrypted storage, auto-refresh, and revocation.
 */
export function createConnectionsSDK(
  config: PluginConfig,
  accessToken: string,
  userId: string
): PluginConnectionsSDK {
  const supabase = getSupabase(accessToken);

  return {
    async exchangeCode(connectionId, code, codeVerifier, redirectUri) {
      const conn = getConnectionConfig(config, connectionId);
      const tokens = await exchangeAuthorizationCode(conn, code, codeVerifier, redirectUri);

      const expiresAt = tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : null;

      // Upsert — replace existing connection if re-authorizing
      const { error } = await supabase
        .from(CONNECTIONS_TABLE)
        .upsert(
          {
            user_id: userId,
            plugin_id: config.id,
            connection_id: connectionId,
            access_token: encrypt(tokens.access_token),
            refresh_token: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
            expires_at: expiresAt,
            scopes: conn.scopes.join(" "),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,plugin_id,connection_id" }
        );

      if (error) throw new Error(`Failed to store connection "${connectionId}": ${error.message}`);
    },

    async getToken(connectionId) {
      const conn = getConnectionConfig(config, connectionId);

      const { data, error } = await supabase
        .from(CONNECTIONS_TABLE)
        .select("access_token, refresh_token, expires_at")
        .eq("user_id", userId)
        .eq("plugin_id", config.id)
        .eq("connection_id", connectionId)
        .single();

      if (error || !data) return null;

      const expiresAt = data.expires_at ? new Date(data.expires_at).getTime() : null;
      const isExpired = expiresAt && Date.now() >= expiresAt - 60_000; // 1 min buffer

      // Token still valid
      if (!isExpired) {
        return decrypt(data.access_token);
      }

      // Try refresh
      if (!data.refresh_token) return null;

      try {
        const refreshToken = decrypt(data.refresh_token);
        const tokens = await refreshAccessToken(conn, refreshToken);

        const newExpiresAt = tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
          : null;

        await supabase
          .from(CONNECTIONS_TABLE)
          .update({
            access_token: encrypt(tokens.access_token),
            refresh_token: tokens.refresh_token ? encrypt(tokens.refresh_token) : data.refresh_token,
            expires_at: newExpiresAt,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId)
          .eq("plugin_id", config.id)
          .eq("connection_id", connectionId);

        return tokens.access_token;
      } catch {
        // Refresh failed — connection is stale
        return null;
      }
    },

    async isConnected(connectionId) {
      getConnectionConfig(config, connectionId); // validate plugin owns this connection

      const { data } = await supabase
        .from(CONNECTIONS_TABLE)
        .select("connection_id")
        .eq("user_id", userId)
        .eq("plugin_id", config.id)
        .eq("connection_id", connectionId)
        .single();

      return !!data;
    },

    async revoke(connectionId) {
      getConnectionConfig(config, connectionId);

      const { error } = await supabase
        .from(CONNECTIONS_TABLE)
        .delete()
        .eq("user_id", userId)
        .eq("plugin_id", config.id)
        .eq("connection_id", connectionId);

      if (error) throw new Error(`Failed to revoke connection "${connectionId}": ${error.message}`);
    },

    async listActive() {
      const { data, error } = await supabase
        .from(CONNECTIONS_TABLE)
        .select("connection_id, scopes, created_at")
        .eq("user_id", userId)
        .eq("plugin_id", config.id)
        .order("created_at", { ascending: false });

      if (error) throw new Error(`Failed to list connections: ${error.message}`);

      return (data ?? []).map((row) => ({
        connectionId: row.connection_id,
        scopes: row.scopes,
        connectedAt: row.created_at,
      }));
    },
  };
}
