ALTER TABLE "blog" RENAME COLUMN "userId" TO "user_id";--> statement-breakpoint
ALTER TABLE "post" RENAME COLUMN "blogId" TO "blog_id";--> statement-breakpoint
ALTER TABLE "user" RENAME COLUMN "emailVerified" TO "email_verified";--> statement-breakpoint
ALTER TABLE "user" RENAME COLUMN "passwordHash" TO "password_hash";--> statement-breakpoint
ALTER TABLE "blog" DROP CONSTRAINT "blog_userId_fkey";
--> statement-breakpoint
ALTER TABLE "post" DROP CONSTRAINT "post_blogId_fkey";
--> statement-breakpoint
DROP INDEX "blog_userId_key";--> statement-breakpoint
ALTER TABLE "blog" ADD CONSTRAINT "blog_userId_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "post" ADD CONSTRAINT "post_blogId_fkey" FOREIGN KEY ("blog_id") REFERENCES "public"."blog"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "blog_userId_key" ON "blog" USING btree ("user_id" int4_ops);