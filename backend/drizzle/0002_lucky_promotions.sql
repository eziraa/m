CREATE TYPE "public"."bonus_type" AS ENUM('percentage', 'fixed');--> statement-breakpoint
CREATE TYPE "public"."deposit_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "deposits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"amount_cents" bigint NOT NULL,
	"promo_code" text,
	"status" "deposit_status" DEFAULT 'pending' NOT NULL,
	"approved_at" timestamp with time zone,
	"approved_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promo_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"bonus_type" "bonus_type" NOT NULL,
	"bonus_value_bps" integer,
	"bonus_value_cents" bigint,
	"max_users" integer NOT NULL,
	"used_count" integer DEFAULT 0 NOT NULL,
	"minimum_deposit_cents" bigint DEFAULT 0 NOT NULL,
	"maximum_bonus_cap_cents" bigint NOT NULL,
	"expiry_date" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_promo_bonus_value_shape" CHECK ((("bonus_type" = 'percentage' AND "bonus_value_bps" IS NOT NULL AND "bonus_value_bps" > 0 AND "bonus_value_cents" IS NULL) OR ("bonus_type" = 'fixed' AND "bonus_value_cents" IS NOT NULL AND "bonus_value_cents" > 0 AND "bonus_value_bps" IS NULL)))
);
--> statement-breakpoint
CREATE TABLE "promo_code_usages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"promo_code_id" uuid NOT NULL,
	"deposit_id" uuid NOT NULL,
	"bonus_amount_cents" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "deposits" ADD CONSTRAINT "deposits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deposits" ADD CONSTRAINT "deposits_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_code_usages" ADD CONSTRAINT "promo_code_usages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_code_usages" ADD CONSTRAINT "promo_code_usages_promo_code_id_promo_codes_id_fk" FOREIGN KEY ("promo_code_id") REFERENCES "public"."promo_codes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_code_usages" ADD CONSTRAINT "promo_code_usages_deposit_id_deposits_id_fk" FOREIGN KEY ("deposit_id") REFERENCES "public"."deposits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_deposits_user_status_created" ON "deposits" USING btree ("user_id","status","created_at");--> statement-breakpoint
CREATE INDEX "idx_deposits_status_created" ON "deposits" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "idx_deposits_promo_code" ON "deposits" USING btree ("promo_code");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_promo_codes_code" ON "promo_codes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_promo_codes_active_expiry" ON "promo_codes" USING btree ("is_active","expiry_date");--> statement-breakpoint
CREATE INDEX "idx_promo_codes_created_at" ON "promo_codes" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_promo_usage_deposit" ON "promo_code_usages" USING btree ("deposit_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_promo_usage_user_promo" ON "promo_code_usages" USING btree ("user_id","promo_code_id");--> statement-breakpoint
CREATE INDEX "idx_promo_usage_promo_created" ON "promo_code_usages" USING btree ("promo_code_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_promo_usage_user_created" ON "promo_code_usages" USING btree ("user_id","created_at");