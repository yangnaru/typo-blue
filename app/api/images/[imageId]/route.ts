import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { imageTable, postImageTable, postTable, blog } from "@/drizzle/schema";
import { deleteFromR2 } from "@/lib/r2";
import { isUuid } from "@/lib/utils";
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
    if (!isUuid(imageId)) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    // Get image metadata and check authorization
    // Join through post_image -> post -> blog to verify ownership
    const result = await db
      .select({
        image: imageTable,
        blogUserId: blog.userId,
        postContent: postTable.content,
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

    const { image, blogUserId, postContent } = result[0];

    // Check if user owns the blog
    if (blogUserId !== user.id) {
      return NextResponse.json(
        { error: "You don't have permission to delete this image" },
        { status: 403 }
      );
    }

    // Refuse while the post still shows it, or the published post would
    // point at a deleted file
    if (postContent?.includes(image.key)) {
      return NextResponse.json(
        { error: "본문에 들어 있는 이미지입니다. 본문에서 먼저 지운 뒤 저장해 주세요." },
        { status: 409 }
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
