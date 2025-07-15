CREATE TABLE "email_queue" (
	"id" text PRIMARY KEY NOT NULL,
	"blog_id" text NOT NULL,
	"post_id" text NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"max_retries" integer DEFAULT 3 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp,
	"scheduled_for" timestamp DEFAULT now() NOT NULL,
	"error_message" text
);
--> statement-breakpoint
ALTER TABLE "email_queue" ADD CONSTRAINT "email_queue_blog_id_blog_id_fk" FOREIGN KEY ("blog_id") REFERENCES "public"."blog"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_queue" ADD CONSTRAINT "email_queue_post_id_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."post"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_queue_status_idx" ON "email_queue" USING btree ("status");--> statement-breakpoint
CREATE INDEX "email_queue_scheduled_idx" ON "email_queue" USING btree ("scheduled_for");--> statement-breakpoint
CREATE INDEX "email_queue_created_at_idx" ON "email_queue" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "blog_user_id_key" ON "blog" USING btree ("user_id" uuid_ops);