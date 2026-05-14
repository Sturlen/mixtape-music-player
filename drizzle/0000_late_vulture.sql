CREATE TABLE "albums" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stable_id" text NOT NULL,
	"name" text NOT NULL,
	"artist_id" uuid NOT NULL,
	CONSTRAINT "albums_stable_id_unique" UNIQUE("stable_id")
);
--> statement-breakpoint
CREATE TABLE "art_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"role" text DEFAULT 'cover' NOT NULL,
	"path" text NOT NULL,
	"mime_type" text,
	"width" integer DEFAULT 0 NOT NULL,
	"height" integer DEFAULT 0 NOT NULL,
	"primary_color" text,
	"text_color" text,
	"file_ext" text
);
--> statement-breakpoint
CREATE TABLE "artists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stable_id" text NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "artists_stable_id_unique" UNIQUE("stable_id")
);
--> statement-breakpoint
CREATE TABLE "audio_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stable_id" text NOT NULL,
	"parent_id" uuid NOT NULL,
	"path" text NOT NULL,
	"name" text NOT NULL,
	"filetype" text DEFAULT 'audio',
	"file_ext" text,
	"duration" real DEFAULT 0,
	CONSTRAINT "audio_assets_stable_id_unique" UNIQUE("stable_id")
);
--> statement-breakpoint
CREATE TABLE "playlist_tracks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"playlist_id" uuid NOT NULL,
	"track_stable_id" text NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "playlists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stable_id" text NOT NULL,
	"name" text NOT NULL,
	"image_url" text,
	CONSTRAINT "playlists_stable_id_unique" UNIQUE("stable_id")
);
--> statement-breakpoint
CREATE TABLE "tracks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stable_id" text NOT NULL,
	"name" text NOT NULL,
	"album_id" uuid NOT NULL,
	"track_number" integer,
	"playtime_seconds" real DEFAULT 0,
	"path" text NOT NULL,
	"art_url" text,
	CONSTRAINT "tracks_stable_id_unique" UNIQUE("stable_id"),
	CONSTRAINT "tracks_path_unique" UNIQUE("path")
);
--> statement-breakpoint
ALTER TABLE "albums" ADD CONSTRAINT "albums_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audio_assets" ADD CONSTRAINT "audio_assets_parent_id_tracks_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playlist_tracks" ADD CONSTRAINT "playlist_tracks_playlist_id_playlists_id_fk" FOREIGN KEY ("playlist_id") REFERENCES "public"."playlists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_album_id_albums_id_fk" FOREIGN KEY ("album_id") REFERENCES "public"."albums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_albums_name_artist" ON "albums" USING btree ("name","artist_id");--> statement-breakpoint
CREATE INDEX "idx_art_assets_entity" ON "art_assets" USING btree ("entity_id","entity_type");--> statement-breakpoint
CREATE INDEX "idx_art_assets_role" ON "art_assets" USING btree ("entity_id","entity_type","role");--> statement-breakpoint
CREATE INDEX "idx_artists_name" ON "artists" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_audio_assets_parent" ON "audio_assets" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "idx_playlist_tracks_playlist" ON "playlist_tracks" USING btree ("playlist_id");--> statement-breakpoint
CREATE INDEX "idx_tracks_album" ON "tracks" USING btree ("album_id");