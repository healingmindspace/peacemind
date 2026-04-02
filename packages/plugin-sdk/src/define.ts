import type { PluginConfig, PluginRegistryConfig } from "./types";

/**
 * Define a plugin configuration.
 * Used in each plugin's plugin.config.ts to declare its contract.
 *
 * @example
 * export default definePlugin({
 *   id: "mood",
 *   name: "Mood Tracker",
 *   icon: "heart",
 *   version: "1.0.0",
 *   tables: [{ name: "moods", encryptedFields: ["triggers", "helped"] }],
 *   entityPrefixes: ["mood"],
 *   rateLimits: { logMood: { max: 100, window: "1h" } },
 *   TabComponent: MoodTab,
 * });
 */
export function definePlugin(config: PluginConfig): PluginConfig {
  return config;
}

/**
 * Define the plugin registry.
 * Used in the platform shell to declare which plugins are available.
 *
 * @example
 * export default defineRegistry({
 *   builtin: ["@peacemind/plugin-mood", "@peacemind/plugin-journal"],
 *   curated: ["@peacemind/plugin-sleep"],
 * });
 */
export function defineRegistry(config: PluginRegistryConfig): PluginRegistryConfig {
  return config;
}
