ALTER TABLE "Blog" RENAME TO "blog";--> statement-breakpoint
ALTER TABLE "EmailVerificationChallenge" RENAME TO "email_verification_challenge";--> statement-breakpoint
ALTER TABLE "Post" RENAME TO "post";--> statement-breakpoint
ALTER TABLE "Session" RENAME TO "session";--> statement-breakpoint
ALTER TABLE "User" RENAME TO "user";--> statement-breakpoint
ALTER TABLE "blog" DROP CONSTRAINT "Blog_userId_fkey";
--> statement-breakpoint
ALTER TABLE "post" DROP CONSTRAINT "Post_blogId_fkey";
--> statement-breakpoint
ALTER TABLE "session" DROP CONSTRAINT "Session_userId_fkey";
--> statement-breakpoint
DROP INDEX "Blog_slug_key";--> statement-breakpoint
DROP INDEX "Blog_userId_key";--> statement-breakpoint
DROP INDEX "User_email_key";--> statement-breakpoint
ALTER TABLE "blog" ADD CONSTRAINT "blog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "post" ADD CONSTRAINT "post_blogId_fkey" FOREIGN KEY ("blogId") REFERENCES "public"."blog"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "blog_slug_key" ON "blog" USING btree ("slug" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "blog_userId_key" ON "blog" USING btree ("userId" int4_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "user_email_key" ON "user" USING btree ("email" text_ops);