import {
  getSupabase,
  getAuthenticatedUserId,
  encrypt,
  decrypt,
  checkRateLimit,
  ENTITY_VERSION,
  TABLES,
} from "@peacemind/lib";
import type { PluginConfig, PluginServerSDK } from "./types";
import { createConnectionsSDK } from "./connections";

// --- Plugin config store (populated at build/startup) ---

const pluginConfigs = new Map<string, PluginConfig>();

/** Register a plugin's config. Called during app initialization. */
export function registerPlugin(config: PluginConfig): void {
  pluginConfigs.set(config.id, config);
}

/** Get a registered plugin config by ID. */
export function getPluginConfig(pluginId: string): PluginConfig | undefined {
  return pluginConfigs.get(pluginId);
}

// --- Boundary enforcement ---

function assertPluginOwnsTable(config: PluginConfig, table: string): void {
  const owns = config.tables.some((t) => t.name === table);
  if (!owns) {
    throw new Error(
      `Plugin "${config.id}" attempted to access table "${table}" which it does not own. ` +
      `Declared tables: ${config.tables.map((t) => t.name).join(", ")}`
    );
  }
}

function assertPluginOwnsPrefix(config: PluginConfig, prefix: string): void {
  if (!config.entityPrefixes.includes(prefix as never)) {
    throw new Error(
      `Plugin "${config.id}" attempted to create entity with prefix "${prefix}" which it does not own. ` +
      `Declared prefixes: ${config.entityPrefixes.join(", ")}`
    );
  }
}

function assertPluginPublishes(config: PluginConfig, event: string): void {
  if (!config.publishes?.includes(event)) {
    throw new Error(
      `Plugin "${config.id}" attempted to publish event "${event}" which it has not declared. ` +
      `Declared publishes: ${(config.publishes ?? []).join(", ")}`
    );
  }
}

function assertPluginSubscribes(config: PluginConfig, event: string): void {
  if (!config.subscribes?.includes(event)) {
    throw new Error(
      `Plugin "${config.id}" attempted to subscribe to event "${event}" which it has not declared. ` +
      `Declared subscribes: ${(config.subscribes ?? []).join(", ")}`
    );
  }
}

// --- Encryption helpers ---

function getEncryptedFields(config: PluginConfig, table: string): string[] {
  const tableDef = config.tables.find((t) => t.name === table);
  return tableDef?.encryptedFields ?? [];
}

function encryptDeclaredFields(
  config: PluginConfig,
  table: string,
  row: Record<string, unknown>
): Record<string, unknown> {
  const fields = getEncryptedFields(config, table);
  if (fields.length === 0) return row;

  const result = { ...row };
  for (const field of fields) {
    if (typeof result[field] === "string") {
      result[field] = encrypt(result[field] as string);
    }
  }
  return result;
}

function decryptFields(
  rows: Record<string, unknown>[],
  fields: string[]
): Record<string, unknown>[] {
  return rows.map((row) => {
    const result = { ...row };
    for (const field of fields) {
      if (typeof result[field] === "string") {
        result[field] = decrypt(result[field] as string);
      }
    }
    return result;
  });
}

// --- Cross-plugin event bus ---

type EventHandler = (data: Record<string, unknown>) => void;
const eventHandlers = new Map<string, EventHandler[]>();
const eventHandlerMeta = new Map<EventHandler, { pluginId: string }>();

// --- Rate limit window parsing ---

function parseWindowMs(window: string): number {
  const match = window.match(/^(\d+)(m|h|d)$/);
  if (!match) return 60 * 60 * 1000; // default 1h
  const value = parseInt(match[1], 10);
  switch (match[2]) {
    case "m": return value * 60 * 1000;
    case "h": return value * 60 * 60 * 1000;
    case "d": return value * 24 * 60 * 60 * 1000;
    default: return 60 * 60 * 1000;
  }
}

// --- SDK factory ---

/**
 * Create a scoped Plugin SDK instance.
 * Enforces table ownership, entity prefix boundaries, and rate limits.
 *
 * @param pluginId - The plugin's unique identifier
 * @param accessToken - The user's Supabase auth token
 */
export async function getPluginSDK(
  pluginId: string,
  accessToken: string
): Promise<PluginServerSDK> {
  const config = pluginConfigs.get(pluginId);
  if (!config) {
    throw new Error(`Plugin "${pluginId}" is not registered`);
  }

  const supabase = getSupabase(accessToken);
  const userId = await getAuthenticatedUserId(supabase);
  if (!userId) {
    throw new Error("User not authenticated");
  }

  return {
    auth: {
      getUserId: () => userId,
    },

    data: {
      async query(table, opts) {
        assertPluginOwnsTable(config, table);

        let query = supabase.from(table).select("*").eq("user_id", userId);

        if (opts?.filters) {
          for (const [key, value] of Object.entries(opts.filters)) {
            query = query.eq(key, value);
          }
        }
        if (opts?.order) {
          query = query.order(opts.order.column, {
            ascending: opts.order.ascending ?? false,
          });
        }
        if (opts?.limit) {
          query = query.limit(opts.limit);
        }

        const { data, error } = await query;
        if (error) throw new Error(`Plugin "${pluginId}" query error: ${error.message}`);

        const rows = (data ?? []) as Record<string, unknown>[];
        if (opts?.decrypt && opts.decrypt.length > 0) {
          return decryptFields(rows, opts.decrypt);
        }
        return rows;
      },

      async insert(table, row) {
        assertPluginOwnsTable(config, table);

        const encrypted = encryptDeclaredFields(config, table, {
          ...row,
          user_id: userId,
        });

        const { error } = await supabase.from(table).insert(encrypted);
        if (error) throw new Error(`Plugin "${pluginId}" insert error: ${error.message}`);
      },

      async update(table, id, updates) {
        assertPluginOwnsTable(config, table);

        const encrypted = encryptDeclaredFields(config, table, updates);
        const { error } = await supabase
          .from(table)
          .update(encrypted)
          .eq("id", id)
          .eq("user_id", userId);
        if (error) throw new Error(`Plugin "${pluginId}" update error: ${error.message}`);
      },

      async delete(table, id) {
        assertPluginOwnsTable(config, table);

        const { error } = await supabase
          .from(table)
          .delete()
          .eq("id", id)
          .eq("user_id", userId);
        if (error) throw new Error(`Plugin "${pluginId}" delete error: ${error.message}`);
      },
    },

    entities: {
      create(prefix) {
        assertPluginOwnsPrefix(config, prefix);
        const uuid = crypto.randomUUID();
        return `${prefix}_${ENTITY_VERSION}_${uuid}`;
      },
    },

    encryption: {
      encrypt: (value: string) => encrypt(value),
      decrypt: (value: string) => decrypt(value),
    },

    insights: {
      async publish(event, data) {
        assertPluginPublishes(config, event);

        // Check which plugins have user consent to receive this event
        const { data: consents } = await supabase
          .from(TABLES.pluginConsents)
          .select("target_plugin_id")
          .eq("user_id", userId)
          .eq("source_plugin_id", config.id)
          .eq("event_name", event);

        const allowedTargets = new Set((consents ?? []).map((c) => c.target_plugin_id));

        // Deliver to handlers that have consent
        const handlers = eventHandlers.get(event) ?? [];
        for (const handler of handlers) {
          // Handler metadata includes the subscribing plugin ID
          const handlerMeta = eventHandlerMeta.get(handler);
          if (handlerMeta && allowedTargets.has(handlerMeta.pluginId)) {
            handler(data);
          }
        }
      },

      subscribe(event, handler) {
        assertPluginSubscribes(config, event);
        const existing = eventHandlers.get(event) ?? [];
        existing.push(handler);
        eventHandlers.set(event, existing);
        // Track which plugin registered this handler (for consent checks)
        eventHandlerMeta.set(handler, { pluginId: config.id });
      },
    },

    storage: {
      async upload(file, filename) {
        const path = `plugins/${pluginId}/${userId}/${filename}`;
        const { error } = await supabase.storage
          .from("photos")
          .upload(path, file, { upsert: true });
        if (error) throw new Error(`Plugin "${pluginId}" upload error: ${error.message}`);
        return path;
      },

      async getSignedUrl(path, expiresIn = 3600) {
        const { data, error } = await supabase.storage
          .from("photos")
          .createSignedUrl(path, expiresIn);
        if (error) throw new Error(`Plugin "${pluginId}" signed URL error: ${error.message}`);
        return data.signedUrl;
      },

      async delete(path) {
        const { error } = await supabase.storage.from("photos").remove([path]);
        if (error) throw new Error(`Plugin "${pluginId}" delete error: ${error.message}`);
      },
    },

    connections: createConnectionsSDK(config, accessToken, userId),
  };
}

/**
 * Check rate limit for a plugin action.
 * Uses the plugin's declared rate limits from its config.
 */
export function checkPluginRateLimit(
  pluginId: string,
  action: string,
  clientIp: string
): boolean {
  const config = pluginConfigs.get(pluginId);
  if (!config) return false;

  const limitConfig = config.rateLimits[action];
  if (!limitConfig) return true; // no limit declared = allowed

  const key = `plugin:${pluginId}:${action}:${clientIp}`;
  const windowMs = parseWindowMs(limitConfig.window);
  return checkRateLimit(key, limitConfig.max, windowMs);
}
