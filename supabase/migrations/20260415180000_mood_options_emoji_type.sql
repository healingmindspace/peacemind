ALTER TABLE "public"."mood_options" DROP CONSTRAINT "mood_options_type_check";
ALTER TABLE "public"."mood_options" ADD CONSTRAINT "mood_options_type_check"
  CHECK ("type" = ANY (ARRAY['trigger'::"text", 'helped'::"text", 'hidden_trigger'::"text", 'hidden_helped'::"text", 'emoji'::"text"]));
