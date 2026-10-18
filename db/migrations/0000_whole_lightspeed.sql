CREATE TABLE "liked_tracks_snapshots" (
	"run_id" uuid NOT NULL,
	"track_id" text NOT NULL,
	"added_at" timestamp with time zone NOT NULL,
	"name" text NOT NULL,
	"artists" jsonb NOT NULL,
	"album_name" text NOT NULL,
	"album_image_url" text,
	"duration_ms" integer NOT NULL,
	CONSTRAINT "liked_tracks_snapshots_run_id_track_id_pk" PRIMARY KEY("run_id","track_id")
);
--> statement-breakpoint
CREATE TABLE "snapshot_runs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source" text NOT NULL,
	"top_tracks_count" integer NOT NULL,
	"top_artists_count" integer NOT NULL,
	"liked_tracks_count" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "top_artists_snapshots" (
	"run_id" uuid NOT NULL,
	"time_range" text NOT NULL,
	"rank" integer NOT NULL,
	"artist_id" text NOT NULL,
	"name" text NOT NULL,
	"genres" jsonb NOT NULL,
	"image_url" text,
	"popularity" integer,
	CONSTRAINT "top_artists_snapshots_run_id_time_range_rank_pk" PRIMARY KEY("run_id","time_range","rank")
);
--> statement-breakpoint
CREATE TABLE "top_tracks_snapshots" (
	"run_id" uuid NOT NULL,
	"time_range" text NOT NULL,
	"rank" integer NOT NULL,
	"track_id" text NOT NULL,
	"name" text NOT NULL,
	"artists" jsonb NOT NULL,
	"album_id" text NOT NULL,
	"album_name" text NOT NULL,
	"album_image_url" text,
	"duration_ms" integer NOT NULL,
	"popularity" integer,
	CONSTRAINT "top_tracks_snapshots_run_id_time_range_rank_pk" PRIMARY KEY("run_id","time_range","rank")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"image_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "liked_tracks_snapshots" ADD CONSTRAINT "liked_tracks_snapshots_run_id_snapshot_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."snapshot_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snapshot_runs" ADD CONSTRAINT "snapshot_runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "top_artists_snapshots" ADD CONSTRAINT "top_artists_snapshots_run_id_snapshot_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."snapshot_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "top_tracks_snapshots" ADD CONSTRAINT "top_tracks_snapshots_run_id_snapshot_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."snapshot_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "snapshot_runs_user_created_idx" ON "snapshot_runs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "top_artists_snapshots_artist_idx" ON "top_artists_snapshots" USING btree ("artist_id");--> statement-breakpoint
CREATE INDEX "top_tracks_snapshots_track_idx" ON "top_tracks_snapshots" USING btree ("track_id");