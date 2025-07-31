ALTER TYPE "public"."notification_type" ADD VALUE 'like';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'emoji_react';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'announce';--> statement-breakpoint
ALTER TABLE "notification" DROP CONSTRAINT "notification_activity_id_blog_id_unique";--> statement-breakpoint
ALTER TABLE "notification" DROP CONSTRAINT "notification_blog_id_blog_id_fk";
--> statement-breakpoint
DROP INDEX "notification_blog_id_idx";--> statement-breakpoint
ALTER TABLE "notification" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "notification" DROP COLUMN "blog_id";--> statement-breakpoint
ALTER TABLE "notification" DROP COLUMN "content_html";--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_activity_id_unique" UNIQUE("activity_id");--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_type_actor_id_object_id_content_unique" UNIQUE("type","actor_id","object_id","content");