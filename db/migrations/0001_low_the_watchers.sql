CREATE TABLE "auto_snapshot_settings" (
	"user_id" text PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"encrypted_refresh_token" text NOT NULL,
	"last_run_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "snapshot_runs" ADD COLUMN "liked_tracks_stored" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "auto_snapshot_settings" ADD CONSTRAINT "auto_snapshot_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;