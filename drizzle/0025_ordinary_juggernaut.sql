ALTER TABLE "image" ADD COLUMN "status" text DEFAULT 'pending' NOT NULL;
UPDATE "image" SET "status" = 'completed' WHERE "deleted_at" IS NULL;