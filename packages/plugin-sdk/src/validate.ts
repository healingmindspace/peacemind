import type { PluginConfig } from "./types";

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// Max rate limits a plugin can declare
const MAX_RATE_LIMITS = {
  max: 1000,
  minWindowMs: 60 * 1000, // 1 minute minimum
};

/**
 * Validate a plugin configuration at build time.
 * Checks structural integrity, security constraints, and contract compliance.
 */
export function validatePlugin(config: PluginConfig): ValidationResult {
  const errors: ValidationError[] = [];

  // --- Required fields ---

  if (!config.id || typeof config.id !== "string") {
    errors.push({ field: "id", message: "Plugin must have a string id" });
  } else if (!/^[a-z][a-z0-9-]*$/.test(config.id)) {
    errors.push({ field: "id", message: "Plugin id must be lowercase alphanumeric with hyphens (e.g., 'mood', 'sleep-tracker')" });
  }

  if (!config.name || typeof config.name !== "string") {
    errors.push({ field: "name", message: "Plugin must have a display name" });
  }

  if (!config.icon || typeof config.icon !== "string") {
    errors.push({ field: "icon", message: "Plugin must have an icon identifier" });
  }

  if (!config.version || !/^\d+\.\d+\.\d+/.test(config.version)) {
    errors.push({ field: "version", message: "Plugin must have a valid semver version" });
  }

  if (!config.TabComponent) {
    errors.push({ field: "TabComponent", message: "Plugin must export a TabComponent" });
  }

  // --- Tables ---

  if (!config.tables || config.tables.length === 0) {
    errors.push({ field: "tables", message: "Plugin must declare at least one table" });
  } else {
    for (const table of config.tables) {
      if (!table.name || typeof table.name !== "string") {
        errors.push({ field: "tables", message: "Each table must have a name" });
      }
      if (table.encryptedFields) {
        for (const field of table.encryptedFields) {
          if (typeof field !== "string") {
            errors.push({ field: "tables", message: `Encrypted field must be a string, got ${typeof field}` });
          }
        }
      }
    }
  }

  // --- Entity Prefixes ---

  if (!config.entityPrefixes || config.entityPrefixes.length === 0) {
    errors.push({ field: "entityPrefixes", message: "Plugin must declare at least one entity prefix" });
  }

  // --- Rate Limits ---

  if (!config.rateLimits || Object.keys(config.rateLimits).length === 0) {
    errors.push({ field: "rateLimits", message: "Plugin must declare at least one rate limit" });
  } else {
    for (const [action, limit] of Object.entries(config.rateLimits)) {
      if (limit.max > MAX_RATE_LIMITS.max) {
        errors.push({
          field: "rateLimits",
          message: `Rate limit for "${action}" exceeds maximum (${limit.max} > ${MAX_RATE_LIMITS.max})`,
        });
      }
      if (limit.max <= 0) {
        errors.push({
          field: "rateLimits",
          message: `Rate limit for "${action}" must be positive`,
        });
      }
      if (!/^\d+(m|h|d)$/.test(limit.window)) {
        errors.push({
          field: "rateLimits",
          message: `Rate limit window for "${action}" must be in format: "10m", "1h", "1d"`,
        });
      }
    }
  }

  // --- Cross-plugin events ---

  if (config.publishes) {
    for (const event of config.publishes) {
      // Events must be namespaced: "pluginId.eventName"
      if (!event.startsWith(`${config.id}.`)) {
        errors.push({
          field: "publishes",
          message: `Published event "${event}" must be prefixed with plugin id "${config.id}." (e.g., "${config.id}.logged")`,
        });
      }
    }
  }

  if (config.subscribes) {
    for (const event of config.subscribes) {
      // Subscribed events must NOT start with own plugin id (can't subscribe to self)
      if (event.startsWith(`${config.id}.`)) {
        errors.push({
          field: "subscribes",
          message: `Plugin cannot subscribe to its own event "${event}"`,
        });
      }
    }
  }

  // --- External Connections ---

  if (config.connections) {
    const connectionIds = new Set<string>();
    for (const conn of config.connections) {
      if (!conn.id || typeof conn.id !== "string") {
        errors.push({ field: "connections", message: "Each connection must have an id" });
      } else if (connectionIds.has(conn.id)) {
        errors.push({ field: "connections", message: `Duplicate connection id "${conn.id}"` });
      } else {
        connectionIds.add(conn.id);
      }

      if (!conn.name) {
        errors.push({ field: "connections", message: `Connection "${conn.id}" must have a name` });
      }

      if (!conn.provider) {
        errors.push({ field: "connections", message: `Connection "${conn.id}" must have a provider` });
      } else {
        const validTypes = ["oauth2-pkce", "oauth2-server", "api-key", "webhook"];
        if (!validTypes.includes(conn.provider.type)) {
          errors.push({
            field: "connections",
            message: `Connection "${conn.id}" provider type must be one of: ${validTypes.join(", ")}`,
          });
        }
        if (!conn.provider.authorizeUrl) {
          errors.push({ field: "connections", message: `Connection "${conn.id}" must have an authorizeUrl` });
        }
        if (!conn.provider.tokenUrl) {
          errors.push({ field: "connections", message: `Connection "${conn.id}" must have a tokenUrl` });
        }
        if (!conn.provider.clientIdEnvVar) {
          errors.push({ field: "connections", message: `Connection "${conn.id}" must have a clientIdEnvVar` });
        }
        if (conn.provider.type === "oauth2-server" && !conn.provider.clientSecretEnvVar) {
          errors.push({
            field: "connections",
            message: `Connection "${conn.id}" with type "oauth2-server" must have a clientSecretEnvVar`,
          });
        }
      }

      if (!conn.scopes || conn.scopes.length === 0) {
        errors.push({ field: "connections", message: `Connection "${conn.id}" must declare at least one scope` });
      }

      if (conn.dataSync?.pollInterval && !/^\d+(m|h|d)$/.test(conn.dataSync.pollInterval)) {
        errors.push({
          field: "connections",
          message: `Connection "${conn.id}" pollInterval must be in format: "15m", "1h", "1d"`,
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate that no two plugins in the registry have overlapping tables or entity prefixes.
 */
export function validateRegistryConflicts(plugins: PluginConfig[]): ValidationResult {
  const errors: ValidationError[] = [];
  const tableOwners = new Map<string, string>();
  const prefixOwners = new Map<string, string>();

  for (const plugin of plugins) {
    // Check table conflicts
    for (const table of plugin.tables) {
      const existing = tableOwners.get(table.name);
      if (existing) {
        errors.push({
          field: "tables",
          message: `Table "${table.name}" is claimed by both "${existing}" and "${plugin.id}"`,
        });
      }
      tableOwners.set(table.name, plugin.id);
    }

    // Check entity prefix conflicts
    for (const prefix of plugin.entityPrefixes) {
      const existing = prefixOwners.get(prefix);
      if (existing) {
        errors.push({
          field: "entityPrefixes",
          message: `Entity prefix "${prefix}" is claimed by both "${existing}" and "${plugin.id}"`,
        });
      }
      prefixOwners.set(prefix, plugin.id);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
