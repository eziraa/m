CREATE TYPE "public"."claim_status" AS ENUM('pending', 'accepted', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."ledger_status" AS ENUM('posted', 'reversed');--> statement-breakpoint
CREATE TYPE "public"."ledger_type" AS ENUM('deposit', 'board_purchase', 'session_win', 'commission', 'withdrawal', 'adjustment', 'referral_reward');--> statement-breakpoint
CREATE TYPE "public"."pattern_type" AS ENUM('row', 'column', 'diagonal', 'full_house');--> statement-breakpoint
CREATE TYPE "public"."room_status" AS ENUM('active', 'suspended', 'archived');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('waiting', 'countdown', 'playing', 'finished', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('ADMIN', 'AGENT', 'USER');--> statement-breakpoint
CREATE TABLE "bingo_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"room_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"board_id" uuid NOT NULL,
	"pattern" "pattern_type" NOT NULL,
	"marked_cells" jsonb NOT NULL,
	"client_last_seq" integer NOT NULL,
	"status" "claim_status" DEFAULT 'pending' NOT NULL,
	"rejection_reason" text,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "board_purchase_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"idempotency_key" text NOT NULL,
	"quantity" integer NOT NULL,
	"board_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "boards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"room_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"board_no" integer NOT NULL,
	"board_matrix" jsonb NOT NULL,
	"board_hash" text NOT NULL,
	"purchase_amount_cents" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"status" "session_status" DEFAULT 'waiting' NOT NULL,
	"countdown_seconds" integer DEFAULT 15 NOT NULL,
	"call_interval_ms" integer DEFAULT 3000 NOT NULL,
	"total_numbers" integer DEFAULT 75 NOT NULL,
	"current_seq" integer DEFAULT 0 NOT NULL,
	"current_number" integer,
	"winner_user_id" uuid,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"board_price_cents" bigint NOT NULL,
	"status" "room_status" DEFAULT 'active' NOT NULL,
	"max_players" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_called_numbers" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"session_id" uuid NOT NULL,
	"seq" integer NOT NULL,
	"number" integer NOT NULL,
	"called_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_winners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"room_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"board_id" uuid NOT NULL,
	"claim_id" uuid NOT NULL,
	"payout_cents" bigint NOT NULL,
	"commission_cents" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telegram_updates" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"update_id" bigint NOT NULL,
	"event_type" varchar(64) NOT NULL,
	"telegram_user_id" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role" "user_role" DEFAULT 'USER' NOT NULL,
	"telegram_id" text,
	"referral_code" text,
	"referred_by_agent_id" uuid,
	"email" text,
	"username" text,
	"first_name" text,
	"last_name" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallet_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"agent_id" uuid,
	"session_id" uuid,
	"board_id" uuid,
	"entry_type" "ledger_type" NOT NULL,
	"amount_cents" bigint NOT NULL,
	"balance_after_cents" bigint,
	"currency" varchar(8) DEFAULT 'ETB' NOT NULL,
	"status" "ledger_status" DEFAULT 'posted' NOT NULL,
	"idempotency_key" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bingo_claims" ADD CONSTRAINT "bingo_claims_session_id_game_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."game_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bingo_claims" ADD CONSTRAINT "bingo_claims_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bingo_claims" ADD CONSTRAINT "bingo_claims_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bingo_claims" ADD CONSTRAINT "bingo_claims_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_purchase_requests" ADD CONSTRAINT "board_purchase_requests_session_id_game_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."game_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_purchase_requests" ADD CONSTRAINT "board_purchase_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boards" ADD CONSTRAINT "boards_session_id_game_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."game_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boards" ADD CONSTRAINT "boards_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boards" ADD CONSTRAINT "boards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_agent_id_users_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_winner_user_id_users_id_fk" FOREIGN KEY ("winner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_agent_id_users_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_called_numbers" ADD CONSTRAINT "session_called_numbers_session_id_game_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."game_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_winners" ADD CONSTRAINT "session_winners_session_id_game_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."game_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_winners" ADD CONSTRAINT "session_winners_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_winners" ADD CONSTRAINT "session_winners_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_winners" ADD CONSTRAINT "session_winners_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_winners" ADD CONSTRAINT "session_winners_claim_id_bingo_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."bingo_claims"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "fk_users_referred_by_agent" FOREIGN KEY ("referred_by_agent_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_ledger" ADD CONSTRAINT "wallet_ledger_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_ledger" ADD CONSTRAINT "wallet_ledger_agent_id_users_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_ledger" ADD CONSTRAINT "wallet_ledger_session_id_game_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."game_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_ledger" ADD CONSTRAINT "wallet_ledger_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_claims_session_user_idempotency" ON "bingo_claims" USING btree ("session_id","user_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "idx_claims_session_created" ON "bingo_claims" USING btree ("session_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_claims_user_created" ON "bingo_claims" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_claims_status_created" ON "bingo_claims" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_board_purchase_req_session_user_key" ON "board_purchase_requests" USING btree ("session_id","user_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "idx_board_purchase_req_user_created" ON "board_purchase_requests" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_boards_session_user" ON "boards" USING btree ("session_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_boards_user_created" ON "boards" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_boards_session_board_no" ON "boards" USING btree ("session_id","board_no");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_boards_session_board_hash" ON "boards" USING btree ("session_id","board_hash");--> statement-breakpoint
CREATE INDEX "idx_sessions_room_status_created" ON "game_sessions" USING btree ("room_id","status","created_at");--> statement-breakpoint
CREATE INDEX "idx_sessions_agent_status_created" ON "game_sessions" USING btree ("agent_id","status","created_at");--> statement-breakpoint
CREATE INDEX "idx_sessions_status_created" ON "game_sessions" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sessions_one_active_per_room" ON "game_sessions" USING btree ("room_id") WHERE "game_sessions"."status" in ('countdown', 'playing');--> statement-breakpoint
CREATE INDEX "idx_rooms_agent_status_created" ON "rooms" USING btree ("agent_id","status","created_at");--> statement-breakpoint
CREATE INDEX "idx_rooms_status_created" ON "rooms" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_called_numbers_session_seq" ON "session_called_numbers" USING btree ("session_id","seq");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_called_numbers_session_number" ON "session_called_numbers" USING btree ("session_id","number");--> statement-breakpoint
CREATE INDEX "idx_called_numbers_session_called_at" ON "session_called_numbers" USING btree ("session_id","called_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_winners_session" ON "session_winners" USING btree ("session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_winners_claim" ON "session_winners" USING btree ("claim_id");--> statement-breakpoint
CREATE INDEX "idx_winners_user_created" ON "session_winners" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_telegram_updates_update_event" ON "telegram_updates" USING btree ("update_id","event_type");--> statement-breakpoint
CREATE INDEX "idx_telegram_updates_user_created" ON "telegram_updates" USING btree ("telegram_user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_users_telegram_id" ON "users" USING btree ("telegram_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_users_referral_code" ON "users" USING btree ("referral_code");--> statement-breakpoint
CREATE INDEX "idx_users_role_created_at" ON "users" USING btree ("role","created_at");--> statement-breakpoint
CREATE INDEX "idx_users_referred_by_agent" ON "users" USING btree ("referred_by_agent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_wallet_user_idempotency" ON "wallet_ledger" USING btree ("user_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "idx_wallet_user_created" ON "wallet_ledger" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_wallet_agent_created" ON "wallet_ledger" USING btree ("agent_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_wallet_session_created" ON "wallet_ledger" USING btree ("session_id","created_at");