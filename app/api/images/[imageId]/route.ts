import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { imageTable, postImageTable, postTable, blog } from "@/drizzle/schema";
import { deleteFromR2 } from "@/lib/r2";
import { getCurrentSession } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ imageId: string }> }
) {
  try {
    // Check authentication
    const { user } = await getCurrentSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { imageId } = await params;

    // Get image metadata and check authorization
    // Join through post_image -> post -> blog to verify ownership
    const result = await db
      .select({
        image: imageTable,
        blogUserId: blog.userId,
      })
      .from(imageTable)
      .innerJoin(postImageTable, eq(imageTable.id, postImageTable.imageId))
      .innerJoin(postTable, eq(postImageTable.postId, postTable.id))
      .innerJoin(blog, eq(postTable.blogId, blog.id))
      .where(eq(imageTable.id, imageId))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Image not found" },
        { status: 404 }
      );
    }

    const { image, blogUserId } = result[0];

    // Check if user owns the blog
    if (blogUserId !== user.id) {
      return NextResponse.json(
        { error: "You don't have permission to delete this image" },
        { status: 403 }
      );
    }

    // Delete from database first, so a failure in R2 doesn't keep the
    // image in the post composer
    await db
      .delete(imageTable)
      .where(eq(imageTable.id, imageId));

    // Then delete from R2; an orphaned object is harmless
    try {
      await deleteFromR2(image.key);
    } catch (error) {
      console.error(`Failed to delete image from R2: ${image.key}`, error);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting image:", error);
    return NextResponse.json(
      { error: "Failed to delete image" },
      { status: 500 }
    );
  }
}
