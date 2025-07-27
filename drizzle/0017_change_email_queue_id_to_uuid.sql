-- Change email_queue.id from text to UUID

-- First, drop any existing data (since this is a breaking change)
TRUNCATE TABLE "email_queue";

-- Change the id column type to UUID
ALTER TABLE "email_queue" ALTER COLUMN "id" TYPE uuid USING "id"::uuid;