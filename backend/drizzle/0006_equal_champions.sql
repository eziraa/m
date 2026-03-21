ALTER TYPE "public"."pattern_type" ADD VALUE 'corners';--> statement-breakpoint
ALTER TABLE "game_sessions" ALTER COLUMN "countdown_seconds" SET DEFAULT 45;--> statement-breakpoint
ALTER TABLE "game_sessions" ADD COLUMN "countdown_resets" integer DEFAULT 0 NOT NULL;