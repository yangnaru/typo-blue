CREATE TABLE "activitypub_activity" (
	"id" uuid PRIMARY KEY NOT NULL,
	"activity_id" text NOT NULL,
	"type" text NOT NULL,
	"actor_id" uuid,
	"remote_actor_id" uuid,
	"object_id" text,
	"target_id" text,
	"data" text NOT NULL,
	"direction" text NOT NULL,
	"created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activitypub_actor" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"handle" text NOT NULL,
	"uri" text NOT NULL,
	"name" text,
	"summary" text,
	"icon_url" text,
	"public_key_pem" text NOT NULL,
	"private_key_pem" text NOT NULL,
	"inbox_url" text NOT NULL,
	"outbox_url" text NOT NULL,
	"followers_url" text NOT NULL,
	"following_url" text NOT NULL,
	"created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activitypub_follow" (
	"id" uuid PRIMARY KEY NOT NULL,
	"actor_id" uuid,
	"target_actor_id" uuid,
	"remote_actor_id" uuid,
	"target_remote_actor_id" uuid,
	"activity_id" text NOT NULL,
	"state" text DEFAULT 'pending' NOT NULL,
	"created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activitypub_remote_actor" (
	"id" uuid PRIMARY KEY NOT NULL,
	"uri" text NOT NULL,
	"handle" text,
	"name" text,
	"summary" text,
	"icon_url" text,
	"public_key_pem" text,
	"inbox_url" text NOT NULL,
	"outbox_url" text,
	"followers_url" text,
	"following_url" text,
	"shared_inbox_url" text,
	"created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated" timestamp with time zone NOT NULL,
	"last_fetched" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "activitypub_activity" ADD CONSTRAINT "activitypub_activity_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."activitypub_actor"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "activitypub_activity" ADD CONSTRAINT "activitypub_activity_remote_actor_id_fkey" FOREIGN KEY ("remote_actor_id") REFERENCES "public"."activitypub_remote_actor"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "activitypub_actor" ADD CONSTRAINT "activitypub_actor_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "activitypub_follow" ADD CONSTRAINT "activitypub_follow_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."activitypub_actor"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "activitypub_follow" ADD CONSTRAINT "activitypub_follow_target_actor_id_fkey" FOREIGN KEY ("target_actor_id") REFERENCES "public"."activitypub_actor"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "activitypub_follow" ADD CONSTRAINT "activitypub_follow_remote_actor_id_fkey" FOREIGN KEY ("remote_actor_id") REFERENCES "public"."activitypub_remote_actor"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "activitypub_follow" ADD CONSTRAINT "activitypub_follow_target_remote_actor_id_fkey" FOREIGN KEY ("target_remote_actor_id") REFERENCES "public"."activitypub_remote_actor"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "activitypub_activity_activity_id_key" ON "activitypub_activity" USING btree ("activity_id" text_ops);--> statement-breakpoint
CREATE INDEX "activitypub_activity_type_idx" ON "activitypub_activity" USING btree ("type");--> statement-breakpoint
CREATE INDEX "activitypub_activity_actor_id_idx" ON "activitypub_activity" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "activitypub_activity_remote_actor_id_idx" ON "activitypub_activity" USING btree ("remote_actor_id");--> statement-breakpoint
CREATE INDEX "activitypub_activity_direction_idx" ON "activitypub_activity" USING btree ("direction");--> statement-breakpoint
CREATE INDEX "activitypub_activity_created_idx" ON "activitypub_activity" USING btree ("created");--> statement-breakpoint
CREATE UNIQUE INDEX "activitypub_actor_handle_key" ON "activitypub_actor" USING btree ("handle" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "activitypub_actor_uri_key" ON "activitypub_actor" USING btree ("uri" text_ops);--> statement-breakpoint
CREATE INDEX "activitypub_actor_user_id_idx" ON "activitypub_actor" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "activitypub_follow_activity_id_key" ON "activitypub_follow" USING btree ("activity_id" text_ops);--> statement-breakpoint
CREATE INDEX "activitypub_follow_actor_id_idx" ON "activitypub_follow" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "activitypub_follow_target_actor_id_idx" ON "activitypub_follow" USING btree ("target_actor_id");--> statement-breakpoint
CREATE INDEX "activitypub_follow_remote_actor_id_idx" ON "activitypub_follow" USING btree ("remote_actor_id");--> statement-breakpoint
CREATE INDEX "activitypub_follow_target_remote_actor_id_idx" ON "activitypub_follow" USING btree ("target_remote_actor_id");--> statement-breakpoint
CREATE INDEX "activitypub_follow_state_idx" ON "activitypub_follow" USING btree ("state");--> statement-breakpoint
CREATE INDEX "activitypub_follow_created_idx" ON "activitypub_follow" USING btree ("created");--> statement-breakpoint
CREATE UNIQUE INDEX "activitypub_remote_actor_uri_key" ON "activitypub_remote_actor" USING btree ("uri" text_ops);--> statement-breakpoint
CREATE INDEX "activitypub_remote_actor_handle_idx" ON "activitypub_remote_actor" USING btree ("handle");--> statement-breakpoint
CREATE INDEX "activitypub_remote_actor_last_fetched_idx" ON "activitypub_remote_actor" USING btree ("last_fetched");