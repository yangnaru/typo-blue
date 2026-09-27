// Called from server code only; kept out of "use server" files so they
// aren't exposed as server actions that anyone could call
import { and, eq, inArray, lt, notExists, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { imageTable, postImageTable, postTable } from "@/drizzle/schema";
import { deleteFromR2 } from "@/lib/r2";

// The image types a post may carry, and the extension each is stored under.
// The extension comes from here and never from the uploaded file's name, so
// an upload can't be stored as .html or .svg.
export const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Deletes the image rows of every post in these blogs, returning their R2 keys
// for deleteImageObjects once the transaction has committed.
export async function deleteImageRowsForBlogs(
  tx: Transaction,
  blogIds: string[]
): Promise<string[]> {
  if (blogIds.length === 0) return [];

  const images = await tx
    .select({ id: imageTable.id, key: imageTable.key })
    .from(postImageTable)
    .innerJoin(imageTable, eq(postImageTable.imageId, imageTable.id))
    .innerJoin(postTable, eq(postImageTable.postId, postTable.id))
    .where(inArray(postTable.blogId, blogIds));
  if (images.length === 0) return [];

  await tx.delete(imageTable).where(
    inArray(
      imageTable.id,
      images.map((image) => image.id)
    )
  );
  return images.map((image) => image.key);
}

// Deletes objects from R2 after their rows are gone. A failure only leaves an
// object nothing points to, so it is logged rather than thrown.
export async function deleteImageObjects(keys: string[]): Promise<void> {
  for (const key of keys) {
    try {
      await deleteFromR2(key);
    } catch (error) {
      console.error(`Failed to delete image from R2: ${key}`, error);
    }
  }
}

// Deletes images left behind for a day: uploads never confirmed, whose upload
// link expired long ago, and images whose post is gone, which blogs and
// accounts deleted before their images were cleaned up left behind.
export async function deleteAbandonedImages(): Promise<number> {
  const images = await db
    .delete(imageTable)
    .where(
      and(
        lt(imageTable.createdAt, sql`now() - interval '1 day'`),
        or(
          eq(imageTable.status, "pending"),
          notExists(
            db
              .select({ id: postImageTable.id })
              .from(postImageTable)
              .where(eq(postImageTable.imageId, imageTable.id))
          )
        )
      )
    )
    .returning({ key: imageTable.key });

  await deleteImageObjects(images.map((image) => image.key));
  return images.length;
}

// Runs deleteAbandonedImages now and then every hour, in the server's process
// like the email worker. Returns a function that stops it.
export function startImageCleanup(): () => void {
  const run = () =>
    deleteAbandonedImages()
      .then((count) => {
        if (count > 0) console.log(`Deleted ${count} abandoned images`);
      })
      .catch((error) => {
        console.error("Failed to delete abandoned images:", error);
      });

  void run();
  const timer = setInterval(run, 60 * 60 * 1000);
  return () => clearInterval(timer);
}
