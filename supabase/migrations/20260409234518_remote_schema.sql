


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."generate_entity_id"("prefix" "text") RETURNS "text"
    LANGUAGE "sql"
    AS $$
    select prefix || '_v1_' || gen_random_uuid()::text
  $$;


ALTER FUNCTION "public"."generate_entity_id"("prefix" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."assessments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "score" integer NOT NULL,
    "answers" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "assessments_type_check" CHECK (("type" = ANY (ARRAY['phq9'::"text", 'gad7'::"text"])))
);


ALTER TABLE "public"."assessments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."breathing_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "method" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."breathing_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."connect_friend_invites" (
    "id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "code" "text" NOT NULL,
    "expires_at" timestamp with time zone,
    "used_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."connect_friend_invites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."connect_friendships" (
    "id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "friend_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "accepted_at" timestamp with time zone,
    CONSTRAINT "connect_friendships_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'blocked'::"text"])))
);


ALTER TABLE "public"."connect_friendships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feedback" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "message" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reply" "text",
    "replied_at" timestamp with time zone,
    "user_email" "text",
    "subject" "text"
);


ALTER TABLE "public"."feedback" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."goals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "icon" "text" DEFAULT '🎯'::"text",
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "active" boolean DEFAULT true,
    "deleted" boolean DEFAULT false,
    "objective" "text",
    "plan" "text"
);


ALTER TABLE "public"."goals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invite_redemptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "inviter_id" "uuid" NOT NULL,
    "invited_id" "uuid" NOT NULL,
    "code" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."invite_redemptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invites" (
    "inviter_id" "uuid" NOT NULL,
    "code" "text" NOT NULL,
    "uses" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."invites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."journals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "response" "text",
    "liked" boolean DEFAULT false,
    "goal_id" "uuid",
    "photo_path" "text",
    "parent_id" "uuid"
);


ALTER TABLE "public"."journals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mood_options" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "label" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "mood_options_type_check" CHECK (("type" = ANY (ARRAY['trigger'::"text", 'helped'::"text", 'hidden_trigger'::"text", 'hidden_helped'::"text"])))
);


ALTER TABLE "public"."mood_options" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."moods" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "emoji" "text" NOT NULL,
    "label" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "trigger" "text",
    "helped" "text",
    "response" "text",
    "photo_path" "text"
);


ALTER TABLE "public"."moods" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."plugin_connections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "plugin_id" "text" NOT NULL,
    "connection_id" "text" NOT NULL,
    "access_token" "text" NOT NULL,
    "refresh_token" "text",
    "expires_at" timestamp with time zone,
    "scopes" "text" DEFAULT ''::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."plugin_connections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."plugin_consents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "source_plugin_id" "text" NOT NULL,
    "event_name" "text" NOT NULL,
    "target_plugin_id" "text" NOT NULL,
    "granted_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."plugin_consents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."saved_insights" (
    "id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "period" "text" NOT NULL,
    "content" "text" NOT NULL,
    "data_date" "text" NOT NULL,
    "lang" "text" DEFAULT 'en'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "saved_insights_period_check" CHECK (("period" = ANY (ARRAY['today'::"text", 'week'::"text", 'month'::"text", 'quarter'::"text"])))
);


ALTER TABLE "public"."saved_insights" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."seed_balances" (
    "user_id" "uuid" NOT NULL,
    "balance" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."seed_balances" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."seed_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "amount" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."seed_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."spotify_playlists" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "spotify_url" "text" NOT NULL,
    "spotify_type" "text" NOT NULL,
    "spotify_id" "text" NOT NULL,
    "name" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."spotify_playlists" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "goal_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "due_date" timestamp with time zone,
    "completed" boolean DEFAULT false,
    "completed_at" timestamp with time zone,
    "google_event_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "schedule_type" "text" DEFAULT 'once'::"text",
    "schedule_rule" "jsonb",
    "duration" integer
);


ALTER TABLE "public"."tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_plugins" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "plugin_id" "text" NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL,
    "settings" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "installed_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_plugins" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."visits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ip" "text" NOT NULL,
    "user_agent" "text",
    "date" "date" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "count" integer DEFAULT 1,
    "device" "text" DEFAULT 'unknown'::"text",
    "country" "text",
    "region" "text"
);


ALTER TABLE "public"."visits" OWNER TO "postgres";


ALTER TABLE ONLY "public"."assessments"
    ADD CONSTRAINT "assessments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."breathing_sessions"
    ADD CONSTRAINT "breathing_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."connect_friend_invites"
    ADD CONSTRAINT "connect_friend_invites_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."connect_friend_invites"
    ADD CONSTRAINT "connect_friend_invites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."connect_friendships"
    ADD CONSTRAINT "connect_friendships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feedback"
    ADD CONSTRAINT "feedback_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."goals"
    ADD CONSTRAINT "goals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invite_redemptions"
    ADD CONSTRAINT "invite_redemptions_invited_id_key" UNIQUE ("invited_id");



ALTER TABLE ONLY "public"."invite_redemptions"
    ADD CONSTRAINT "invite_redemptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invites"
    ADD CONSTRAINT "invites_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."invites"
    ADD CONSTRAINT "invites_pkey" PRIMARY KEY ("inviter_id");



ALTER TABLE ONLY "public"."journals"
    ADD CONSTRAINT "journals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mood_options"
    ADD CONSTRAINT "mood_options_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."moods"
    ADD CONSTRAINT "moods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."plugin_connections"
    ADD CONSTRAINT "plugin_connections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."plugin_connections"
    ADD CONSTRAINT "plugin_connections_user_id_plugin_id_connection_id_key" UNIQUE ("user_id", "plugin_id", "connection_id");



ALTER TABLE ONLY "public"."plugin_consents"
    ADD CONSTRAINT "plugin_consents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."plugin_consents"
    ADD CONSTRAINT "plugin_consents_user_id_source_plugin_id_event_name_target__key" UNIQUE ("user_id", "source_plugin_id", "event_name", "target_plugin_id");



ALTER TABLE ONLY "public"."saved_insights"
    ADD CONSTRAINT "saved_insights_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."saved_insights"
    ADD CONSTRAINT "saved_insights_user_id_period_data_date_lang_key" UNIQUE ("user_id", "period", "data_date", "lang");



ALTER TABLE ONLY "public"."seed_balances"
    ADD CONSTRAINT "seed_balances_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."seed_history"
    ADD CONSTRAINT "seed_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."spotify_playlists"
    ADD CONSTRAINT "spotify_playlists_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_plugins"
    ADD CONSTRAINT "user_plugins_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_plugins"
    ADD CONSTRAINT "user_plugins_user_id_plugin_id_key" UNIQUE ("user_id", "plugin_id");



ALTER TABLE ONLY "public"."visits"
    ADD CONSTRAINT "visits_pkey" PRIMARY KEY ("id");



CREATE INDEX "assessments_user_type_idx" ON "public"."assessments" USING "btree" ("user_id", "type", "created_at" DESC);



CREATE INDEX "idx_connect_friend_invites_code" ON "public"."connect_friend_invites" USING "btree" ("code");



CREATE INDEX "idx_connect_friendships_friend" ON "public"."connect_friendships" USING "btree" ("friend_id");



CREATE INDEX "idx_connect_friendships_user" ON "public"."connect_friendships" USING "btree" ("user_id");



CREATE INDEX "idx_plugin_connections_lookup" ON "public"."plugin_connections" USING "btree" ("user_id", "plugin_id", "connection_id");



CREATE INDEX "idx_plugin_consents_source" ON "public"."plugin_consents" USING "btree" ("user_id", "source_plugin_id", "event_name");



CREATE INDEX "idx_plugin_consents_target" ON "public"."plugin_consents" USING "btree" ("user_id", "target_plugin_id");



CREATE INDEX "idx_saved_insights_user" ON "public"."saved_insights" USING "btree" ("user_id", "period", "data_date");



CREATE INDEX "idx_seed_history_user" ON "public"."seed_history" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_tasks_goal" ON "public"."tasks" USING "btree" ("goal_id");



CREATE INDEX "idx_tasks_user_due" ON "public"."tasks" USING "btree" ("user_id", "due_date") WHERE ("completed" = false);



CREATE INDEX "idx_user_plugins_lookup" ON "public"."user_plugins" USING "btree" ("user_id", "plugin_id");



CREATE INDEX "mood_options_user_type_idx" ON "public"."mood_options" USING "btree" ("user_id", "type");



ALTER TABLE ONLY "public"."assessments"
    ADD CONSTRAINT "assessments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."breathing_sessions"
    ADD CONSTRAINT "breathing_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."connect_friend_invites"
    ADD CONSTRAINT "connect_friend_invites_used_by_fkey" FOREIGN KEY ("used_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."connect_friend_invites"
    ADD CONSTRAINT "connect_friend_invites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."connect_friendships"
    ADD CONSTRAINT "connect_friendships_friend_id_fkey" FOREIGN KEY ("friend_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."connect_friendships"
    ADD CONSTRAINT "connect_friendships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."feedback"
    ADD CONSTRAINT "feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."goals"
    ADD CONSTRAINT "goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invite_redemptions"
    ADD CONSTRAINT "invite_redemptions_invited_id_fkey" FOREIGN KEY ("invited_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."invite_redemptions"
    ADD CONSTRAINT "invite_redemptions_inviter_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."invites"
    ADD CONSTRAINT "invites_inviter_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."journals"
    ADD CONSTRAINT "journals_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."journals"
    ADD CONSTRAINT "journals_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."journals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."journals"
    ADD CONSTRAINT "journals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mood_options"
    ADD CONSTRAINT "mood_options_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."moods"
    ADD CONSTRAINT "moods_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."plugin_connections"
    ADD CONSTRAINT "plugin_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."plugin_consents"
    ADD CONSTRAINT "plugin_consents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."saved_insights"
    ADD CONSTRAINT "saved_insights_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."seed_balances"
    ADD CONSTRAINT "seed_balances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."seed_history"
    ADD CONSTRAINT "seed_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."spotify_playlists"
    ADD CONSTRAINT "spotify_playlists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_plugins"
    ADD CONSTRAINT "user_plugins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admin can delete feedback" ON "public"."feedback" FOR DELETE USING ((("auth"."jwt"() ->> 'email'::"text") = 'healingmindspace@proton.me'::"text"));



CREATE POLICY "Admin can read all breathing" ON "public"."breathing_sessions" FOR SELECT USING ((("auth"."jwt"() ->> 'email'::"text") = 'healingmindspace@proton.me'::"text"));



CREATE POLICY "Admin can read all feedback" ON "public"."feedback" FOR SELECT USING ((("auth"."jwt"() ->> 'email'::"text") = 'healingmindspace@proton.me'::"text"));



CREATE POLICY "Admin can read all journals" ON "public"."journals" FOR SELECT USING ((("auth"."jwt"() ->> 'email'::"text") = 'healingmindspace@proton.me'::"text"));



CREATE POLICY "Admin can read all moods" ON "public"."moods" FOR SELECT USING ((("auth"."jwt"() ->> 'email'::"text") = 'healingmindspace@proton.me'::"text"));



CREATE POLICY "Admin can read all visits" ON "public"."visits" FOR SELECT USING ((("auth"."jwt"() ->> 'email'::"text") = 'healingmindspace@proton.me'::"text"));



CREATE POLICY "Admin can update feedback" ON "public"."feedback" FOR UPDATE USING ((("auth"."jwt"() ->> 'email'::"text") = 'healingmindspace@proton.me'::"text"));



CREATE POLICY "Anyone can accept invites" ON "public"."connect_friend_invites" FOR UPDATE USING (true);



CREATE POLICY "Anyone can insert feedback" ON "public"."feedback" FOR INSERT WITH CHECK (true);



CREATE POLICY "Anyone can insert visits" ON "public"."visits" FOR INSERT WITH CHECK (true);



CREATE POLICY "Anyone can read visits" ON "public"."visits" FOR SELECT USING (true);



CREATE POLICY "Anyone can update visit count" ON "public"."visits" FOR UPDATE USING (true);



CREATE POLICY "Users can delete own options" ON "public"."mood_options" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own journals" ON "public"."journals" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own moods" ON "public"."moods" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own playlists" ON "public"."spotify_playlists" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own assessments" ON "public"."assessments" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own options" ON "public"."mood_options" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own journals" ON "public"."journals" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own moods" ON "public"."moods" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own playlists" ON "public"."spotify_playlists" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own sessions" ON "public"."breathing_sessions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own goals" ON "public"."goals" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own tasks" ON "public"."tasks" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read own feedback" ON "public"."feedback" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read their own journals" ON "public"."journals" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read their own moods" ON "public"."moods" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read their own playlists" ON "public"."spotify_playlists" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read their own sessions" ON "public"."breathing_sessions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own moods" ON "public"."moods" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own journals" ON "public"."journals" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own assessments" ON "public"."assessments" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own options" ON "public"."mood_options" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users create friendships" ON "public"."connect_friendships" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") OR ("auth"."uid"() = "friend_id")));



CREATE POLICY "Users create invites" ON "public"."connect_friend_invites" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users delete own friendships" ON "public"."connect_friendships" FOR DELETE USING ((("auth"."uid"() = "user_id") OR ("auth"."uid"() = "friend_id")));



CREATE POLICY "Users manage own connections" ON "public"."plugin_connections" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage own consents" ON "public"."plugin_consents" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage own insights" ON "public"."saved_insights" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage own invites" ON "public"."invites" USING (("auth"."uid"() = "inviter_id")) WITH CHECK (("auth"."uid"() = "inviter_id"));



CREATE POLICY "Users manage own plugins" ON "public"."user_plugins" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage own seeds" ON "public"."seed_balances" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users see own friendships" ON "public"."connect_friendships" FOR SELECT USING ((("auth"."uid"() = "user_id") OR ("auth"."uid"() = "friend_id")));



CREATE POLICY "Users see own invites" ON "public"."connect_friend_invites" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users see own redemptions" ON "public"."invite_redemptions" USING ((("auth"."uid"() = "inviter_id") OR ("auth"."uid"() = "invited_id")));



CREATE POLICY "Users see own seed history" ON "public"."seed_history" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users update own friendships" ON "public"."connect_friendships" FOR UPDATE USING ((("auth"."uid"() = "user_id") OR ("auth"."uid"() = "friend_id")));



ALTER TABLE "public"."assessments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."breathing_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."connect_friend_invites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."connect_friendships" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."feedback" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."goals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invite_redemptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."journals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mood_options" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."moods" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."plugin_connections" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."plugin_consents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."saved_insights" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."seed_balances" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."seed_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."spotify_playlists" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_plugins" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."visits" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."generate_entity_id"("prefix" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_entity_id"("prefix" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_entity_id"("prefix" "text") TO "service_role";


















GRANT ALL ON TABLE "public"."assessments" TO "anon";
GRANT ALL ON TABLE "public"."assessments" TO "authenticated";
GRANT ALL ON TABLE "public"."assessments" TO "service_role";



GRANT ALL ON TABLE "public"."breathing_sessions" TO "anon";
GRANT ALL ON TABLE "public"."breathing_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."breathing_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."connect_friend_invites" TO "anon";
GRANT ALL ON TABLE "public"."connect_friend_invites" TO "authenticated";
GRANT ALL ON TABLE "public"."connect_friend_invites" TO "service_role";



GRANT ALL ON TABLE "public"."connect_friendships" TO "anon";
GRANT ALL ON TABLE "public"."connect_friendships" TO "authenticated";
GRANT ALL ON TABLE "public"."connect_friendships" TO "service_role";



GRANT ALL ON TABLE "public"."feedback" TO "anon";
GRANT ALL ON TABLE "public"."feedback" TO "authenticated";
GRANT ALL ON TABLE "public"."feedback" TO "service_role";



GRANT ALL ON TABLE "public"."goals" TO "anon";
GRANT ALL ON TABLE "public"."goals" TO "authenticated";
GRANT ALL ON TABLE "public"."goals" TO "service_role";



GRANT ALL ON TABLE "public"."invite_redemptions" TO "anon";
GRANT ALL ON TABLE "public"."invite_redemptions" TO "authenticated";
GRANT ALL ON TABLE "public"."invite_redemptions" TO "service_role";



GRANT ALL ON TABLE "public"."invites" TO "anon";
GRANT ALL ON TABLE "public"."invites" TO "authenticated";
GRANT ALL ON TABLE "public"."invites" TO "service_role";



GRANT ALL ON TABLE "public"."journals" TO "anon";
GRANT ALL ON TABLE "public"."journals" TO "authenticated";
GRANT ALL ON TABLE "public"."journals" TO "service_role";



GRANT ALL ON TABLE "public"."mood_options" TO "anon";
GRANT ALL ON TABLE "public"."mood_options" TO "authenticated";
GRANT ALL ON TABLE "public"."mood_options" TO "service_role";



GRANT ALL ON TABLE "public"."moods" TO "anon";
GRANT ALL ON TABLE "public"."moods" TO "authenticated";
GRANT ALL ON TABLE "public"."moods" TO "service_role";



GRANT ALL ON TABLE "public"."plugin_connections" TO "anon";
GRANT ALL ON TABLE "public"."plugin_connections" TO "authenticated";
GRANT ALL ON TABLE "public"."plugin_connections" TO "service_role";



GRANT ALL ON TABLE "public"."plugin_consents" TO "anon";
GRANT ALL ON TABLE "public"."plugin_consents" TO "authenticated";
GRANT ALL ON TABLE "public"."plugin_consents" TO "service_role";



GRANT ALL ON TABLE "public"."saved_insights" TO "anon";
GRANT ALL ON TABLE "public"."saved_insights" TO "authenticated";
GRANT ALL ON TABLE "public"."saved_insights" TO "service_role";



GRANT ALL ON TABLE "public"."seed_balances" TO "anon";
GRANT ALL ON TABLE "public"."seed_balances" TO "authenticated";
GRANT ALL ON TABLE "public"."seed_balances" TO "service_role";



GRANT ALL ON TABLE "public"."seed_history" TO "anon";
GRANT ALL ON TABLE "public"."seed_history" TO "authenticated";
GRANT ALL ON TABLE "public"."seed_history" TO "service_role";



GRANT ALL ON TABLE "public"."spotify_playlists" TO "anon";
GRANT ALL ON TABLE "public"."spotify_playlists" TO "authenticated";
GRANT ALL ON TABLE "public"."spotify_playlists" TO "service_role";



GRANT ALL ON TABLE "public"."tasks" TO "anon";
GRANT ALL ON TABLE "public"."tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."tasks" TO "service_role";



GRANT ALL ON TABLE "public"."user_plugins" TO "anon";
GRANT ALL ON TABLE "public"."user_plugins" TO "authenticated";
GRANT ALL ON TABLE "public"."user_plugins" TO "service_role";



GRANT ALL ON TABLE "public"."visits" TO "anon";
GRANT ALL ON TABLE "public"."visits" TO "authenticated";
GRANT ALL ON TABLE "public"."visits" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";


  create policy "Users can delete own photos"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'photos'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "Users can upload own photos"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'photos'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "Users can view own photos"
  on "storage"."objects"
  as permissive
  for select
  to public
using (((bucket_id = 'photos'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



