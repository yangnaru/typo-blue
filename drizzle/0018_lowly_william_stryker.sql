ALTER TABLE "post" DROP CONSTRAINT "first_published_required";--> statement-breakpoint
ALTER TABLE "email_queue" DROP CONSTRAINT "email_queue_blog_id_fkey";
--> statement-breakpoint
ALTER TABLE "email_queue" DROP CONSTRAINT "email_queue_post_id_fkey";
--> statement-breakpoint
ALTER TABLE "email_queue" ALTER COLUMN "blog_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "email_queue" ALTER COLUMN "post_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "email_queue" ALTER COLUMN "created_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "email_queue" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "email_queue" ALTER COLUMN "processed_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "email_queue" ALTER COLUMN "scheduled_for" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "email_queue" ALTER COLUMN "scheduled_for" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "email_queue" ALTER COLUMN "sent_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "email_queue" ALTER COLUMN "opened_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "email_queue" ALTER COLUMN "clicked_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "page_views" ALTER COLUMN "created_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "page_views" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "page_views" ALTER COLUMN "ip_address" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "email_queue" ADD CONSTRAINT "email_queue_blog_id_blog_id_fk" FOREIGN KEY ("blog_id") REFERENCES "public"."blog"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_queue" ADD CONSTRAINT "email_queue_post_id_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."post"("id") ON DELETE cascade ON UPDATE no action;