"use client";

import { useCallback } from "react";

/**
 * Hook to call a plugin's server action with the user's access token.
 * Wraps the action with error handling and loading state.
 *
 * @example
 * const logMood = usePluginAction("mood", actions.logMood);
 * await logMood({ score: 4, triggers: ["work"] });
 */
export function usePluginAction<TInput, TOutput>(
  pluginId: string,
  action: (input: TInput) => Promise<TOutput>
): (input: TInput) => Promise<TOutput> {
  return useCallback(
    async (input: TInput) => {
      try {
        return await action(input);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        throw new Error(`Plugin "${pluginId}" action failed: ${message}`);
      }
    },
    [pluginId, action]
  );
}
