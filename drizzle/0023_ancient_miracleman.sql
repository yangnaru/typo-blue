CREATE TYPE "public"."notification_type" AS ENUM('mention', 'quote', 'reply');--> statement-breakpoint
CREATE TABLE "notification" (
	"id" uuid PRIMARY KEY NOT NULL,
	"blog_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"actor_id" uuid NOT NULL,
	"activity_id" text NOT NULL,
	"object_id" text,
	"post_id" uuid,
	"content" text,
	"content_html" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "notification_activity_id_blog_id_unique" UNIQUE("activity_id","blog_id")
);
--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_blog_id_blog_id_fk" FOREIGN KEY ("blog_id") REFERENCES "public"."blog"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_actor_id_actor_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."actor"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_post_id_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."post"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notification_blog_id_idx" ON "notification" USING btree ("blog_id");--> statement-breakpoint
CREATE INDEX "notification_created_idx" ON "notification" USING btree ("created");--> statement-breakpoint
CREATE INDEX "notification_is_read_idx" ON "notification" USING btree ("is_read");