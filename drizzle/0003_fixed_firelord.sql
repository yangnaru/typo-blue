ALTER TABLE "blog" RENAME COLUMN "createdAt" TO "created";--> statement-breakpoint
ALTER TABLE "blog" RENAME COLUMN "updatedAt" TO "updated";--> statement-breakpoint
ALTER TABLE "email_verification_challenge" RENAME COLUMN "expiresAt" TO "expires";--> statement-breakpoint
ALTER TABLE "post" RENAME COLUMN "createdAt" TO "created";--> statement-breakpoint
ALTER TABLE "post" RENAME COLUMN "updatedAt" TO "updated";--> statement-breakpoint
ALTER TABLE "post" RENAME COLUMN "publishedAt" TO "published";--> statement-breakpoint
ALTER TABLE "post" RENAME COLUMN "deletedAt" TO "deleted";--> statement-breakpoint
ALTER TABLE "session" RENAME COLUMN "expiresAt" TO "expires";--> statement-breakpoint
ALTER TABLE "user" RENAME COLUMN "createdAt" TO "created";--> statement-breakpoint
ALTER TABLE "user" RENAME COLUMN "updatedAt" TO "updated";