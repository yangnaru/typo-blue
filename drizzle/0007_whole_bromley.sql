ALTER TABLE "session" DROP CONSTRAINT "session_userId_fkey";
ALTER TABLE "blog" DROP CONSTRAINT "blog_userId_fkey";
ALTER TABLE "user" DROP CONSTRAINT "User_pkey";

ALTER TABLE "user" RENAME COLUMN "id" TO "old_id";
ALTER TABLE "user" ADD COLUMN "id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid();

ALTER TABLE "session" RENAME COLUMN "userId" TO "old_user_id";
ALTER TABLE "session" ADD COLUMN "user_id" uuid;
UPDATE "session" SET "user_id" = (
    SELECT "id" FROM "user" WHERE "old_id" = "session"."old_user_id"
);
ALTER TABLE "session" DROP COLUMN "old_user_id";
ALTER TABLE "session" ALTER COLUMN "user_id" SET NOT NULL;

ALTER TABLE "blog" RENAME COLUMN "user_id" TO "old_user_id";
ALTER TABLE "blog" ADD COLUMN "user_id" uuid;
UPDATE "blog" SET "user_id" = (
    SELECT "id" FROM "user" WHERE "old_id" = "blog"."old_user_id"
);
ALTER TABLE "blog" DROP COLUMN "old_user_id";
ALTER TABLE "blog" ALTER COLUMN "user_id" SET NOT NULL;

ALTER TABLE "user" DROP COLUMN "old_id";
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;
ALTER TABLE "blog" ADD CONSTRAINT "blog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;
