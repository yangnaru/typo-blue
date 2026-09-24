ALTER TABLE "mailing_list_subscription" ADD COLUMN "confirmed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "mailing_list_subscription" ADD COLUMN "confirmation_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "reauthenticated_at" timestamp with time zone;--> statement-breakpoint
-- Existing subscribers signed up before confirmation existed; keep them
UPDATE "mailing_list_subscription" SET "confirmed_at" = "created" WHERE "confirmed_at" IS NULL;--> statement-breakpoint
-- Emails are compared as given, so store them normalized; no two differ only in case
UPDATE "user" SET "email" = lower(trim("email")) WHERE "email" <> lower(trim("email"));--> statement-breakpoint
UPDATE "mailing_list_subscription" SET "email" = lower(trim("email")) WHERE "email" <> lower(trim("email"));--> statement-breakpoint
DELETE FROM "email_verification_challenge" WHERE "expires" < now();
