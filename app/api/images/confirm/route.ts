import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { blog, imageTable, postImageTable, postTable } from "@/drizzle/schema";
import { getPublicUrl } from "@/lib/r2";
import { getCurrentSession } from "@/lib/auth";
import { and, eq } from "drizzle-orm";
import { isUuid } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { user } = await getCurrentSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { imageId, postId } = body;

    if (
      typeof imageId !== "string" ||
      typeof postId !== "string" ||
      !isUuid(imageId) ||
      !isUuid(postId)
    ) {
      return NextResponse.json(
        { error: "Missing required fields: imageId, postId" },
        { status: 400 }
      );
    }

    // Check authorization: verify user owns the blog that owns this post
    const postResult = await db
      .select({ blogUserId: blog.userId })
      .from(postTable)
      .innerJoin(blog, eq(postTable.blogId, blog.id))
      .where(eq(postTable.id, postId))
      .limit(1);

    if (postResult.length === 0) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (postResult[0].blogUserId !== user.id) {
      return NextResponse.json(
        { error: "You don't have permission to add images to this post" },
        { status: 403 }
      );
    }

    // Mark the image completed and attach it to the post together, and only
    // if it's still pending, so it can't end up completed but unattached
    const updatedImage = await db.transaction(async (tx) => {
      const [image] = await tx
        .update(imageTable)
        .set({ status: "completed" })
        .where(and(eq(imageTable.id, imageId), eq(imageTable.status, "pending")))
        .returning();
      if (!image) return null;

      await tx
        .insert(postImageTable)
        .values({ postId, imageId: image.id })
        .onConflictDoNothing();
      return image;
    });

    if (!updatedImage) {
      return NextResponse.json(
        { error: "Image not found or already confirmed" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: updatedImage.id,
      url: getPublicUrl(updatedImage.key),
      width: updatedImage.width,
      height: updatedImage.height,
      filename: updatedImage.filename,
      key: updatedImage.key,
    });
  } catch (error) {
    console.error("Error confirming image upload:", error);
    return NextResponse.json(
      { error: "Failed to confirm image upload" },
      { status: 500 }
    );
  }
}
