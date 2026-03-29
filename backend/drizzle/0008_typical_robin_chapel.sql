DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_type t
		JOIN pg_namespace n ON n.oid = t.typnamespace
		WHERE t.typname = 'payment_status' AND n.nspname = 'public'
	) THEN
		CREATE TYPE "public"."payment_status" AS ENUM('pending', 'approved', 'rejected');
	END IF;
END
$$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"agent_id" uuid NOT NULL,
	"source" text NOT NULL,
	"amount" bigint NOT NULL,
	"phonenumber" text NOT NULL,
	"datetime" timestamp with time zone NOT NULL,
	"transaction_number" text NOT NULL,
	"sms_content" text NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'payments_user_id_users_id_fk'
	) THEN
		ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
	END IF;
END
$$;--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'payments_agent_id_users_id_fk'
	) THEN
		ALTER TABLE "payments" ADD CONSTRAINT "payments_agent_id_users_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END
$$;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_payments_transaction_number" ON "payments" USING btree ("transaction_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payments_agent_status_created" ON "payments" USING btree ("agent_id","status","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payments_status_created" ON "payments" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payments_source_created" ON "payments" USING btree ("source","created_at");
