ALTER TABLE "post" DROP CONSTRAINT "post_blogId_fkey";
ALTER TABLE "blog" DROP CONSTRAINT "Blog_pkey";

ALTER TABLE "blog" RENAME COLUMN "id" TO "old_id";
ALTER TABLE "blog" ADD COLUMN "id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid();

ALTER TABLE "post" RENAME COLUMN "blog_id" TO "old_blog_id";
ALTER TABLE "post" ADD COLUMN "blog_id" uuid;
UPDATE "post" SET "blog_id" = (
    SELECT "id" FROM "blog" WHERE "old_id" = "post"."old_blog_id"
);

ALTER TABLE "post" DROP COLUMN "old_blog_id";
ALTER TABLE "post" ALTER COLUMN "blog_id" SET NOT NULL;

ALTER TABLE "blog" DROP COLUMN "old_id";
ALTER TABLE "post" ADD CONSTRAINT "post_blog_id_fkey" FOREIGN KEY ("blog_id") REFERENCES "public"."blog"("id") ON DELETE cascade ON UPDATE cascade;