// Single source of truth for all Supabase table names
// Use TABLES.moods instead of "moods" in API routes

export const TABLES = {
  moods: "moods",
  journals: "journals",
  breathingSessions: "breathing_sessions",
  goals: "goals",
  tasks: "tasks",
  moodOptions: "mood_options",
  assessments: "assessments",
  spotifyPlaylists: "spotify_playlists",
  feedback: "feedback",
  visits: "visits",
  dailyCheckins: "daily_checkins",
  // Platform tables
  pluginConnections: "plugin_connections",
  userPlugins: "user_plugins",
  pluginConsents: "plugin_consents",
  seedBalances: "seed_balances",
  seedHistory: "seed_history",
  invites: "invites",
  inviteRedemptions: "invite_redemptions",
  friendships: "connect_friendships",
  friendInvites: "connect_friend_invites",
  savedInsights: "saved_insights",
} as const;

// Storage buckets
export const BUCKETS = {
  photos: "photos",
} as const;
