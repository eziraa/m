CREATE TYPE "public"."withdrawal_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "withdrawals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"amount_cents" bigint NOT NULL,
	"phone" text NOT NULL,
	"status" "withdrawal_status" DEFAULT 'pending' NOT NULL,
	"rejection_reason" text,
	"approved_at" timestamp with time zone,
	"approved_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_withdrawals_user_status_created" ON "withdrawals" USING btree ("user_id","status","created_at");--> statement-breakpoint
CREATE INDEX "idx_withdrawals_status_created" ON "withdrawals" USING btree ("status","created_at");