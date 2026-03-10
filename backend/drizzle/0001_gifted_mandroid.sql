CREATE TABLE "local_auth_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "local_auth_credentials" ADD CONSTRAINT "local_auth_credentials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_local_auth_user" ON "local_auth_credentials" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_local_auth_email" ON "local_auth_credentials" USING btree ("email");