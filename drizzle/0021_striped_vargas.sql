CREATE TYPE "public"."actor_type" AS ENUM('Person', 'Service', 'Group', 'Application', 'Organization');--> statement-breakpoint
CREATE TABLE "actor" (
	"id" uuid PRIMARY KEY NOT NULL,
	"iri" text NOT NULL,
	"type" "actor_type" NOT NULL,
	"username" text NOT NULL,
	"instance_host" text NOT NULL,
	"handle_host" text NOT NULL,
	"handle" text GENERATED ALWAYS AS ('@' || "actor"."username" || '@' || "actor"."handle_host") STORED NOT NULL,
	"blog_id" uuid,
	"name" text,
	"bio_html" text,
	"automatically_approves_followers" boolean DEFAULT false NOT NULL,
	"avatar_url" text,
	"header_url" text,
	"inbox_url" text NOT NULL,
	"shared_inbox_url" text,
	"followers_url" text,
	"featured_url" text,
	"field_htmls" json DEFAULT '{}'::json NOT NULL,
	"emojis" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"tags" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sensitive" boolean DEFAULT false NOT NULL,
	"successor_id" uuid,
	"aliases" text[] DEFAULT (ARRAY[]::text[]) NOT NULL,
	"followees_count" integer DEFAULT 0 NOT NULL,
	"followers_count" integer DEFAULT 0 NOT NULL,
	"posts_count" integer DEFAULT 0 NOT NULL,
	"url" text,
	"updated" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"published" timestamp with time zone,
	"created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "actor_iri_unique" UNIQUE("iri"),
	CONSTRAINT "actor_blog_id_unique" UNIQUE("blog_id"),
	CONSTRAINT "actor_username_instance_host_unique" UNIQUE("username","instance_host"),
	CONSTRAINT "actor_username_check" CHECK ("actor"."username" NOT LIKE '%@%')
);
--> statement-breakpoint
CREATE TABLE "following" (
	"iri" text PRIMARY KEY NOT NULL,
	"follower_id" uuid NOT NULL,
	"followee_id" uuid NOT NULL,
	"accepted" timestamp with time zone,
	"created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "following_follower_id_followee_id_unique" UNIQUE("follower_id","followee_id")
);
--> statement-breakpoint
CREATE TABLE "instance" (
	"host" text PRIMARY KEY NOT NULL,
	"software" text,
	"software_version" text,
	"updated" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "instance_host_check" CHECK ("instance"."host" NOT LIKE '%@%')
);
--> statement-breakpoint
DROP TABLE "activitypub_activity" CASCADE;--> statement-breakpoint
DROP TABLE "activitypub_actor" CASCADE;--> statement-breakpoint
DROP TABLE "activitypub_follow" CASCADE;--> statement-breakpoint
DROP TABLE "activitypub_remote_actor" CASCADE;--> statement-breakpoint
ALTER TABLE "actor" ADD CONSTRAINT "actor_instance_host_instance_host_fk" FOREIGN KEY ("instance_host") REFERENCES "public"."instance"("host") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actor" ADD CONSTRAINT "actor_blog_id_blog_id_fk" FOREIGN KEY ("blog_id") REFERENCES "public"."blog"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actor" ADD CONSTRAINT "actor_successor_id_actor_id_fk" FOREIGN KEY ("successor_id") REFERENCES "public"."actor"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "following" ADD CONSTRAINT "following_follower_id_actor_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."actor"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "following" ADD CONSTRAINT "following_followee_id_actor_id_fk" FOREIGN KEY ("followee_id") REFERENCES "public"."actor"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "following_follower_id_index" ON "following" USING btree ("follower_id");