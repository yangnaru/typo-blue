ALTER TABLE "Follow" ALTER COLUMN "followerId" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "Follow" ADD COLUMN "iri" text;--> statement-breakpoint
ALTER TABLE "Follow" ADD COLUMN "acceptedAt" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "Blog" ADD COLUMN "privateKey" jsonb NOT NULL DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "Blog" ADD COLUMN "publicKey" jsonb NOT NULL DEFAULT '{}'::jsonb;