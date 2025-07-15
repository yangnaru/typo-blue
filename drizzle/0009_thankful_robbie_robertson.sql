DROP INDEX "blog_user_id_key";--> statement-breakpoint
CREATE UNIQUE INDEX "blog_user_id_key" ON "blog" USING btree ("user_id" uuid_ops);