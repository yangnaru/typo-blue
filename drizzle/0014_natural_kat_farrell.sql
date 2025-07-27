ALTER TABLE "post" ADD COLUMN "first_published" timestamp with time zone;

-- Backfill first_published with existing published data for already published posts
UPDATE "post" SET "first_published" = "published" WHERE "published" IS NOT NULL;