


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



CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."artwork_type_enum" AS ENUM (
    'Digital',
    'Traditional'
);


ALTER TYPE "public"."artwork_type_enum" OWNER TO "postgres";


CREATE TYPE "public"."commission_status_enum" AS ENUM (
    'New',
    'Accepted',
    'In Progress',
    'Completed',
    'Declined'
);


ALTER TYPE "public"."commission_status_enum" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."commissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "email" "text" NOT NULL,
    "phone_number" "text",
    "artwork_type" "public"."artwork_type_enum" NOT NULL,
    "medium" "text",
    "size" "text",
    "description" "text" NOT NULL,
    "style_preference" "text",
    "reference_images" "text"[] DEFAULT '{}'::"text"[],
    "deadline" "date",
    "deadline_flexibility" "text" NOT NULL,
    "payment_method" "text" NOT NULL,
    "additional_comment" "text",
    "status" "public"."commission_status_enum" DEFAULT 'New'::"public"."commission_status_enum" NOT NULL,
    "internal_notes" "text",
    "pay_mode" "text" DEFAULT 'hourly'::"text",
    "pay_rate" numeric DEFAULT 0.00,
    "total_price" numeric DEFAULT 0.00,
    "amount_paid" numeric DEFAULT 0.00,
    "aspect_ratio" "text",
    "prefered_file_type" "text"
);


ALTER TABLE "public"."commissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."healthcheck" (
    "id" "uuid"
);


ALTER TABLE "public"."healthcheck" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."work_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "commission_id" "uuid",
    "work_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "hours" numeric NOT NULL,
    "description" "text"
);


ALTER TABLE "public"."work_logs" OWNER TO "postgres";


ALTER TABLE ONLY "public"."commissions"
    ADD CONSTRAINT "commissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."work_logs"
    ADD CONSTRAINT "work_logs_pkey" PRIMARY KEY ("id");



CREATE OR REPLACE TRIGGER "on_commission_created" AFTER INSERT ON "public"."commissions" FOR EACH ROW EXECUTE FUNCTION "supabase_functions"."http_request"('https://gvooqilvlqztifzpwaew.supabase.co/functions/v1/send_email', 'POST', '{"Content-Type":"application/json"}', '{}', '5000');



CREATE OR REPLACE TRIGGER "update_commissions_updated_at" BEFORE UPDATE ON "public"."commissions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."work_logs"
    ADD CONSTRAINT "work_logs_commission_id_fkey" FOREIGN KEY ("commission_id") REFERENCES "public"."commissions"("id") ON DELETE CASCADE;



CREATE POLICY "Allow artist to delete commissions" ON "public"."commissions" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Allow artist to update commissions" ON "public"."commissions" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow artist to view commissions" ON "public"."commissions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow public submissions" ON "public"."commissions" FOR INSERT WITH CHECK (true);



CREATE POLICY "Artist full access to work logs" ON "public"."work_logs" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."commissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."healthcheck" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."work_logs" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."commissions" TO "anon";
GRANT ALL ON TABLE "public"."commissions" TO "authenticated";
GRANT ALL ON TABLE "public"."commissions" TO "service_role";



GRANT ALL ON TABLE "public"."healthcheck" TO "anon";
GRANT ALL ON TABLE "public"."healthcheck" TO "authenticated";
GRANT ALL ON TABLE "public"."healthcheck" TO "service_role";



GRANT ALL ON TABLE "public"."work_logs" TO "anon";
GRANT ALL ON TABLE "public"."work_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."work_logs" TO "service_role";









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

create extension if not exists "pg_net" with schema "public";


  create policy "Allow artist to view reference images"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using ((bucket_id = 'reference-images'::text));



  create policy "Allow public image downloads"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'reference-images'::text));



  create policy "Allow public image uploads"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check ((bucket_id = 'reference-images'::text));



