CREATE TYPE "public"."agent_payment_method_kind" AS ENUM('cbe', 'telebirr', 'other');--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE n.nspname = 'public' AND t.typname = 'ledger_type' AND e.enumlabel = 'game_fee'
  ) THEN
    ALTER TYPE "public"."ledger_type" ADD VALUE 'game_fee' BEFORE 'withdrawal';
  END IF;
END $$;--> statement-breakpoint
CREATE TABLE "agent_payment_methods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"kind" "agent_payment_method_kind" NOT NULL,
	"account_number" text NOT NULL,
	"holder_name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_payment_methods" ADD CONSTRAINT "agent_payment_methods_agent_id_users_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_agent_payment_methods_agent" ON "agent_payment_methods" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "idx_agent_payment_methods_agent_kind" ON "agent_payment_methods" USING btree ("agent_id","kind");