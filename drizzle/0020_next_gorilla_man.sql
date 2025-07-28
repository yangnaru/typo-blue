ALTER TABLE "activitypub_actor" RENAME COLUMN "user_id" TO "blog_id";--> statement-breakpoint
ALTER TABLE "activitypub_actor" DROP CONSTRAINT "activitypub_actor_user_id_fkey";
--> statement-breakpoint
DROP INDEX "activitypub_actor_user_id_idx";--> statement-breakpoint
ALTER TABLE "activitypub_actor" ADD CONSTRAINT "activitypub_actor_blog_id_fkey" FOREIGN KEY ("blog_id") REFERENCES "public"."blog"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "activitypub_actor_blog_id_key" ON "activitypub_actor" USING btree ("blog_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "activitypub_actor_blog_id_idx" ON "activitypub_actor" USING btree ("blog_id");