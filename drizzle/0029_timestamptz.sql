-- These were the last columns without a time zone, and each depended on a
-- convention: the app wrote UTC into email_queue, while page_views.created_at
-- took its default, now() in the database's time zone, which is Asia/Seoul.
-- Say which, so every row keeps the moment it recorded. One ALTER TABLE per
-- table, so each is rewritten once.
ALTER TABLE "email_queue"
  ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "created_at" SET DEFAULT now(),
  ALTER COLUMN "processed_at" SET DATA TYPE timestamp with time zone USING "processed_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "scheduled_for" SET DATA TYPE timestamp with time zone USING "scheduled_for" AT TIME ZONE 'UTC',
  ALTER COLUMN "scheduled_for" SET DEFAULT now(),
  ALTER COLUMN "sent_at" SET DATA TYPE timestamp with time zone USING "sent_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "opened_at" SET DATA TYPE timestamp with time zone USING "opened_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "clicked_at" SET DATA TYPE timestamp with time zone USING "clicked_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "page_views"
  ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'Asia/Seoul',
  ALTER COLUMN "created_at" SET DEFAULT now();
