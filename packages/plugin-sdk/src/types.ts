import type { EntityPrefix } from "@peacemind/lib";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { FC } from "react";

// --- Plugin Configuration (what plugin authors define) ---

export interface TableDefinition {
  /** Table name in Supabase (must match TABLES constant) */
  name: string;
  /** Fields that should be encrypted at rest */
  encryptedFields?: string[];
}

export interface RateLimitConfig {
  /** Max requests allowed in the window */
  max: number;
  /** Time window: "1h", "10m", "1d" */
  window: string;
}

export interface PluginEventSchema {
  /** Human-readable description of the event */
  description: string;
}

export interface SharedDataSchema {
  /** Human-readable description of what this data provides */
  description: string;
}

// --- External Connections ---

export type OAuthProviderType = "oauth2-pkce" | "oauth2-server" | "api-key" | "webhook";

export interface OAuthProvider {
  /** Auth flow type */
  type: OAuthProviderType;
  /** OAuth authorize URL (e.g., "https://accounts.spotify.com/authorize") */
  authorizeUrl: string;
  /** Token exchange URL (e.g., "https://accounts.spotify.com/api/token") */
  tokenUrl: string;
  /** Env var name for client ID (e.g., "SPOTIFY_CLIENT_ID") */
  clientIdEnvVar: string;
  /** Env var name for client secret — server-side only, required for oauth2-server type */
  clientSecretEnvVar?: string;
}

export interface ConnectionDataSync {
  /** Events this connection can emit when syncing data */
  events: string[];
  /** How often to sync: "15m", "1h", "6h", "1d" */
  pollInterval?: string;
}

export interface ExternalConnection {
  /** Unique connection identifier (e.g., "spotify", "facebook", "plaid") */
  id: string;
  /** Display name (e.g., "Spotify") */
  name: string;
  /** Icon for the connection */
  icon: string;
  /** OAuth provider configuration */
  provider: OAuthProvider;
  /** OAuth scopes to request */
  scopes: string[];
  /** Optional data sync configuration */
  dataSync?: ConnectionDataSync;
}

/** Stored connection state for a user (in plugin_connections table) */
export interface StoredConnection {
  userId: string;
  pluginId: string;
  connectionId: string;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
  scopes: string;
  createdAt: string;
  updatedAt: string;
}

export interface PluginConfig {
  /** Unique plugin identifier (e.g., "mood", "sleep", "finance") */
  id: string;
  /** Display name shown in UI */
  name: string;
  /** Icon identifier for tab/nav */
  icon: string;
  /** Semver version string */
  version: string;

  // --- Data ---

  /** Database tables this plugin owns */
  tables: TableDefinition[];
  /** Entity ID prefixes this plugin uses */
  entityPrefixes: EntityPrefix[];

  // --- Rate Limits ---

  /** Per-action rate limits */
  rateLimits: Record<string, RateLimitConfig>;

  // --- Cross-Plugin ---

  /** Events this plugin emits */
  publishes?: string[];
  /** Events this plugin listens to (requires user consent) */
  subscribes?: string[];
  /** Data this plugin exposes to other plugins */
  sharedData?: Record<string, SharedDataSchema>;

  // --- Permissions ---

  /** Platform capabilities this plugin needs (e.g., "storage:photos", "ai:generate") */
  permissions?: string[];

  // --- External Connections ---

  /** External services this plugin connects to */
  connections?: ExternalConnection[];

  // --- UI ---

  /** Main tab component (Server Component) */
  TabComponent: FC;
  /** Optional dashboard widget (Server Component) */
  WidgetComponent?: FC;
  /** Optional plugin settings panel */
  SettingsComponent?: FC;

  // --- i18n ---

  /** Translation bundles keyed by locale */
  i18n?: Record<string, Record<string, string>>;

  // --- Lifecycle ---

  /** Called when plugin is first enabled by a user */
  onInstall?: () => Promise<void>;
  /** Called when plugin is disabled by a user */
  onUninstall?: () => Promise<void>;
}

// --- Plugin Server SDK (what plugins get access to) ---

export interface PluginDataSDK {
  /** Query rows from a plugin-owned table */
  query<T = Record<string, unknown>>(
    table: string,
    opts?: {
      filters?: Record<string, unknown>;
      order?: { column: string; ascending?: boolean };
      limit?: number;
      /** Fields to auto-decrypt */
      decrypt?: string[];
    }
  ): Promise<T[]>;

  /** Insert a row into a plugin-owned table */
  insert(table: string, row: Record<string, unknown>): Promise<void>;

  /** Update a row by ID */
  update(table: string, id: string, updates: Record<string, unknown>): Promise<void>;

  /** Delete a row by ID */
  delete(table: string, id: string): Promise<void>;
}

export interface PluginAuthSDK {
  /** Get the authenticated user's ID */
  getUserId(): string;
}

export interface PluginEntitySDK {
  /** Generate a new entity ID with the plugin's prefix */
  create(prefix: EntityPrefix): string;
}

export interface PluginEncryptionSDK {
  /** Encrypt a string value */
  encrypt(value: string): string;
  /** Decrypt a string value */
  decrypt(value: string): string;
}

export interface PluginInsightsSDK {
  /** Publish an event for other plugins to consume */
  publish(event: string, data: Record<string, unknown>): Promise<void>;
  /** Subscribe to events from other plugins */
  subscribe(event: string, handler: (data: Record<string, unknown>) => void): void;
}

export interface PluginStorageSDK {
  /** Upload a file, returns the storage path */
  upload(file: Buffer, filename: string): Promise<string>;
  /** Get a time-limited signed URL */
  getSignedUrl(path: string, expiresIn?: number): Promise<string>;
  /** Delete a file */
  delete(path: string): Promise<void>;
}

export interface PluginConnectionsSDK {
  /** Exchange an OAuth authorization code for tokens and store them encrypted */
  exchangeCode(connectionId: string, code: string, codeVerifier?: string, redirectUri?: string): Promise<void>;
  /** Get a valid access token (auto-refreshes if expired) */
  getToken(connectionId: string): Promise<string | null>;
  /** Check if a connection is active for the current user */
  isConnected(connectionId: string): Promise<boolean>;
  /** Revoke and delete stored tokens for a connection */
  revoke(connectionId: string): Promise<void>;
  /** Get all active connections for the current user */
  listActive(): Promise<{ connectionId: string; scopes: string; connectedAt: string }[]>;
}

export interface PluginServerSDK {
  auth: PluginAuthSDK;
  data: PluginDataSDK;
  entities: PluginEntitySDK;
  encryption: PluginEncryptionSDK;
  insights: PluginInsightsSDK;
  storage: PluginStorageSDK;
  connections: PluginConnectionsSDK;
}

// --- Plugin Registry ---

export interface PluginRegistryConfig {
  /** First-party plugins built by peacemind */
  builtin: string[];
  /** Reviewed and approved third-party plugins */
  curated?: string[];
}

export interface UserPluginState {
  pluginId: string;
  enabled: boolean;
  installedAt: string;
  settings: Record<string, unknown>;
  /** Cross-plugin event consent: event name → allowed plugin IDs */
  consents: Record<string, string[]>;
}

/** Internal resolved plugin with loaded config */
export interface ResolvedPlugin {
  config: PluginConfig;
  source: "builtin" | "curated";
}
