import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { imageTable, postImageTable } from "@/drizzle/schema";
import { eq, isNull } from "drizzle-orm";
import { getPublicUrl } from "@/lib/r2";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const postId = searchParams.get("postId");

    if (!postId) {
      return NextResponse.json(
        { error: "postId query parameter is required" },
        { status: 400 }
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
        createdAt: imageTable.createdAt,
        deletedAt: imageTable.deletedAt,
      })
      .from(postImageTable)
      .innerJoin(imageTable, eq(postImageTable.imageId, imageTable.id))
      .where(eq(postImageTable.postId, postId))
      .orderBy(imageTable.createdAt);

    // Filter out soft-deleted images and add public URLs
    const activeImages = results
      .filter((img) => !img.deletedAt)
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
