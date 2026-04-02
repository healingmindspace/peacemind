import type { PluginConfig, PluginRegistryConfig, ResolvedPlugin } from "./types";
import { getPluginConfig } from "./server";

// --- Registry state ---

let registryConfig: PluginRegistryConfig | null = null;
const resolvedPlugins = new Map<string, ResolvedPlugin>();

/**
 * Initialize the plugin registry with the platform's config.
 * Called once during app startup.
 */
export function initRegistry(config: PluginRegistryConfig): void {
  registryConfig = config;
}

/**
 * Register a resolved plugin (config loaded from package).
 * Called during app initialization for each plugin in the registry.
 */
export function registerResolvedPlugin(
  pluginConfig: PluginConfig,
  source: "builtin" | "curated"
): void {
  resolvedPlugins.set(pluginConfig.id, { config: pluginConfig, source });
}

/**
 * Get all registered plugins.
 */
export function getRegistry(): ResolvedPlugin[] {
  return Array.from(resolvedPlugins.values());
}

/**
 * Get all builtin plugins.
 */
export function getBuiltinPlugins(): ResolvedPlugin[] {
  return getRegistry().filter((p) => p.source === "builtin");
}

/**
 * Get all curated (third-party) plugins.
 */
export function getCuratedPlugins(): ResolvedPlugin[] {
  return getRegistry().filter((p) => p.source === "curated");
}

/**
 * Get a specific plugin from the registry by ID.
 */
export function getRegisteredPlugin(pluginId: string): ResolvedPlugin | undefined {
  return resolvedPlugins.get(pluginId);
}

/**
 * Get active plugins for the current user.
 * For now, returns all builtin plugins (all users get them).
 * In the future, this will query user_plugins table for enabled state.
 */
export function getActivePlugins(): ResolvedPlugin[] {
  // Phase 1: all builtin plugins are active for all users
  // Phase 2: query user_plugins table for per-user enabled state
  return getBuiltinPlugins();
}

/**
 * Get plugin configs as an array (for validation).
 */
export function getAllPluginConfigs(): PluginConfig[] {
  return getRegistry().map((p) => p.config);
}
