CREATE TABLE "sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"root_path" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "sources_root_path_unique" UNIQUE("root_path")
);
--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "source_id" uuid;--> statement-breakpoint
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;