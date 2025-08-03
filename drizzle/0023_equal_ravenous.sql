CREATE INDEX "post_blog_id_idx" ON "post" USING btree ("blog_id");--> statement-breakpoint
CREATE INDEX "post_first_published_idx" ON "post" USING btree ("first_published");--> statement-breakpoint
CREATE INDEX "post_published_idx" ON "post" USING btree ("published");--> statement-breakpoint
CREATE INDEX "post_blog_id_first_published_idx" ON "post" USING btree ("blog_id","first_published");--> statement-breakpoint
CREATE INDEX "post_created_idx" ON "post" USING btree ("created");