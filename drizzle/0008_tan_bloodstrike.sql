CREATE TABLE "mailing_list_subscription" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"blog_id" uuid NOT NULL,
	"created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"unsubscribe_token" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_email_sent" (
	"id" uuid PRIMARY KEY NOT NULL,
	"post_id" uuid NOT NULL,
	"sentAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mailing_list_subscription" ADD CONSTRAINT "mailing_list_subscription_blog_id_fkey" FOREIGN KEY ("blog_id") REFERENCES "public"."blog"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "post_email_sent" ADD CONSTRAINT "post_email_sent_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."post"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "mailing_list_subscription_email_blog_id_key" ON "mailing_list_subscription" USING btree ("email" text_ops,"blog_id" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "mailing_list_subscription_unsubscribe_token_key" ON "mailing_list_subscription" USING btree ("unsubscribe_token" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "post_email_sent_post_id_key" ON "post_email_sent" USING btree ("post_id" uuid_ops);