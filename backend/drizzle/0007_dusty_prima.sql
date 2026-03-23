CREATE TYPE "public"."broadcast_delete_mode" AS ENUM('selected', 'all', 'date_range');--> statement-breakpoint
CREATE TYPE "public"."delivery_deletion_status" AS ENUM('none', 'queued', 'deleted', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."delivery_status" AS ENUM('pending', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('queued', 'running', 'done', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."post_status" AS ENUM('draft', 'scheduled', 'sending', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."post_target" AS ENUM('users', 'channel');--> statement-breakpoint
CREATE TABLE "admin_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "broadcast_delete_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"requested_by" uuid NOT NULL,
	"mode" "broadcast_delete_mode" NOT NULL,
	"status" "job_status" DEFAULT 'queued' NOT NULL,
	"filters" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"total_targeted" integer DEFAULT 0 NOT NULL,
	"success_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "broadcast_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"format" text DEFAULT 'markdown' NOT NULL,
	"target" "post_target" DEFAULT 'users' NOT NULL,
	"category_id" uuid,
	"images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"buttons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "post_status" DEFAULT 'draft' NOT NULL,
	"scheduled_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"created_by" uuid NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"channel_chat_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"user_id" uuid,
	"chat_id" text NOT NULL,
	"status" "delivery_status" DEFAULT 'pending' NOT NULL,
	"message_id" text,
	"error_message" text,
	"delivered_at" timestamp with time zone,
	"deletion_status" "delivery_deletion_status" DEFAULT 'none' NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "broadcast_delete_jobs" ADD CONSTRAINT "broadcast_delete_jobs_post_id_broadcast_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."broadcast_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broadcast_delete_jobs" ADD CONSTRAINT "broadcast_delete_jobs_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broadcast_posts" ADD CONSTRAINT "broadcast_posts_category_id_post_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."post_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broadcast_posts" ADD CONSTRAINT "broadcast_posts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broadcast_posts" ADD CONSTRAINT "broadcast_posts_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_deliveries" ADD CONSTRAINT "post_deliveries_post_id_broadcast_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."broadcast_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_deliveries" ADD CONSTRAINT "post_deliveries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_admin_settings_updated_at" ON "admin_settings" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "idx_broadcast_delete_jobs_post_created" ON "broadcast_delete_jobs" USING btree ("post_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_broadcast_delete_jobs_status" ON "broadcast_delete_jobs" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "idx_broadcast_posts_status_updated" ON "broadcast_posts" USING btree ("status","updated_at");--> statement-breakpoint
CREATE INDEX "idx_broadcast_posts_scheduled" ON "broadcast_posts" USING btree ("scheduled_at","status");--> statement-breakpoint
CREATE INDEX "idx_broadcast_posts_target" ON "broadcast_posts" USING btree ("target");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_post_categories_name" ON "post_categories" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_post_categories_slug" ON "post_categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_post_categories_active" ON "post_categories" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_post_deliveries_post_status" ON "post_deliveries" USING btree ("post_id","status","created_at");--> statement-breakpoint
CREATE INDEX "idx_post_deliveries_chat" ON "post_deliveries" USING btree ("chat_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_post_deliveries_user" ON "post_deliveries" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_post_deliveries_deletion" ON "post_deliveries" USING btree ("post_id","deletion_status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_post_deliveries_post_chat" ON "post_deliveries" USING btree ("post_id","chat_id");