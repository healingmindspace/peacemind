// Entity ID prefixes — single source of truth for all peacemind apps
// Format: prefix_v1_uuid (e.g., mood_v1_550e8400-e29b-41d4...)

export const ENTITY_PREFIX = {
  mood: "mood",
  journal: "jrnl",
  task: "task",
  goal: "goal",
  assessment: "asmt",
  moodOption: "mopt",
  breathingSession: "brth",
  dailyCheckin: "chkn",
  medication: "med",
  feedback: "fdbk",
  visit: "vst",
  spotifyPlaylist: "sptf",
  photo: "phto",
  thread: "thrd",
  reply: "rply",
  expert: "expt",
  content: "ctnt",
  symptom: "symp",
  bloodSugar: "bglu",
  activity: "actv",
  // Platform entities
  pluginConnection: "pcon",
  userPlugin: "uplg",
  pluginConsent: "pcns",
} as const;

export type EntityPrefix = typeof ENTITY_PREFIX[keyof typeof ENTITY_PREFIX];

export const ENTITY_VERSION = "v1";

/**
 * Parse an entity ID to extract prefix, version, and uuid
 * e.g., "mood_v1_550e8400..." → { prefix: "mood", version: "v1", uuid: "550e8400..." }
 */
export function parseEntityId(id: string): { prefix: string; version: string; uuid: string } | null {
  const parts = id.match(/^([a-z]+)_(v\d+)_(.+)$/);
  if (!parts) return null;
  return { prefix: parts[1], version: parts[2], uuid: parts[3] };
}

/**
 * Check if an ID belongs to a specific entity type
 * e.g., isEntityType("mood_v1_abc123", "mood") → true
 */
export function isEntityType(id: string, prefix: EntityPrefix): boolean {
  return id.startsWith(`${prefix}_${ENTITY_VERSION}_`);
}

/**
 * Get the entity type from an ID
 * e.g., getEntityType("mood_v1_abc123") → "mood"
 */
export function getEntityType(id: string): EntityPrefix | null {
  const parsed = parseEntityId(id);
  if (!parsed) return null;
  const match = Object.values(ENTITY_PREFIX).find((p) => p === parsed.prefix);
  return match || null;
}
