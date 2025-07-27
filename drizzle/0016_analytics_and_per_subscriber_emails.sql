-- Restructure email_queue to work per-subscriber and add analytics tables

-- First, create a backup of existing email_queue data if needed
-- CREATE TABLE email_queue_backup AS SELECT * FROM email_queue;

-- Drop existing email_queue table constraints and indexes
DROP INDEX IF EXISTS "email_queue_status_idx";
DROP INDEX IF EXISTS "email_queue_scheduled_idx";
DROP INDEX IF EXISTS "email_queue_created_at_idx";

-- Recreate email_queue table with per-subscriber structure
DROP TABLE IF EXISTS "email_queue";

CREATE TABLE "email_queue" (
  "id" text PRIMARY KEY NOT NULL,
  "blog_id" text NOT NULL,
  "post_id" text NOT NULL,
  "subscriber_email" text NOT NULL,
  "unsubscribe_token" text NOT NULL,
  "type" text NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "retry_count" integer NOT NULL DEFAULT 0,
  "max_retries" integer NOT NULL DEFAULT 3,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "processed_at" timestamp with time zone,
  "scheduled_for" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "error_message" text,
  "sent_at" timestamp with time zone,
  "opened_at" timestamp with time zone,
  "clicked_at" timestamp with time zone
);

-- Add foreign key constraints for email_queue
ALTER TABLE "email_queue" ADD CONSTRAINT "email_queue_blog_id_fkey" FOREIGN KEY ("blog_id") REFERENCES "blog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "email_queue" ADD CONSTRAINT "email_queue_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add indexes for email_queue
CREATE INDEX "email_queue_status_idx" ON "email_queue" ("status");
CREATE INDEX "email_queue_scheduled_idx" ON "email_queue" ("scheduled_for");
CREATE INDEX "email_queue_created_at_idx" ON "email_queue" ("created_at");
CREATE INDEX "email_queue_blog_id_idx" ON "email_queue" ("blog_id");
CREATE INDEX "email_queue_post_id_idx" ON "email_queue" ("post_id");
CREATE INDEX "email_queue_subscriber_email_idx" ON "email_queue" ("subscriber_email");
CREATE INDEX "email_queue_sent_at_idx" ON "email_queue" ("sent_at");
CREATE INDEX "email_queue_opened_at_idx" ON "email_queue" ("opened_at");
CREATE INDEX "email_queue_clicked_at_idx" ON "email_queue" ("clicked_at");

-- Page views tracking table
CREATE TABLE IF NOT EXISTS "page_views" (
  "id" uuid PRIMARY KEY NOT NULL,
  "blog_id" uuid NOT NULL,
  "post_id" uuid,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "ip_address" inet NOT NULL,
  "user_agent" text,
  "referrer" text,
  "path" text NOT NULL
);

-- Add foreign key constraints for page_views
ALTER TABLE "page_views" ADD CONSTRAINT "page_views_blog_id_fkey" FOREIGN KEY ("blog_id") REFERENCES "blog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "page_views" ADD CONSTRAINT "page_views_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add indexes for analytics queries on page_views
CREATE INDEX IF NOT EXISTS "page_views_blog_id_idx" ON "page_views" ("blog_id");
CREATE INDEX IF NOT EXISTS "page_views_post_id_idx" ON "page_views" ("post_id");
CREATE INDEX IF NOT EXISTS "page_views_created_at_idx" ON "page_views" ("created_at");
CREATE INDEX IF NOT EXISTS "page_views_ip_address_idx" ON "page_views" ("ip_address");