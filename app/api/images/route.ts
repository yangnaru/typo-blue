import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { imageTable, postImageTable, postTable, blog } from "@/drizzle/schema";
import { eq, and } from "drizzle-orm";
import { getPublicUrl } from "@/lib/r2";
import { getCurrentSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const { user } = await getCurrentSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const postId = searchParams.get("postId");

    if (!postId) {
      return NextResponse.json(
        { error: "postId query parameter is required" },
        { status: 400 }
      );
    }

    // Check authorization: verify user owns the blog that owns this post
    const postResult = await db
      .select({
        postId: postTable.id,
        blogUserId: blog.userId,
      })
      .from(postTable)
      .innerJoin(blog, eq(postTable.blogId, blog.id))
      .where(eq(postTable.id, postId))
      .limit(1);

    if (postResult.length === 0) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (postResult[0].blogUserId !== user.id) {
      return NextResponse.json(
        { error: "You don't have permission to access images for this post" },
        { status: 403 }
      );
    }

    // Query through junction table to get images for this post
    const results = await db
      .select({
        id: imageTable.id,
        width: imageTable.width,
        height: imageTable.height,
        filename: imageTable.filename,
        key: imageTable.key,
        status: imageTable.status,
        createdAt: imageTable.createdAt,
        deletedAt: imageTable.deletedAt,
      })
      .from(postImageTable)
      .innerJoin(imageTable, eq(postImageTable.imageId, imageTable.id))
      .where(eq(postImageTable.postId, postId))
      .orderBy(imageTable.createdAt);

    // Filter out soft-deleted and pending images, add public URLs
    const activeImages = results
      .filter((img) => !img.deletedAt && img.status === "completed")
      .map((img) => ({
        id: img.id,
        url: getPublicUrl(img.key),
        width: img.width,
        height: img.height,
        filename: img.filename,
        key: img.key,
        createdAt: img.createdAt,
      }));

    return NextResponse.json(activeImages);
  } catch (error) {
    console.error("Error fetching images:", error);
    return NextResponse.json(
      { error: "Failed to fetch images" },
      { status: 500 }
    );
  }
}
