import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { imageTable, postImageTable } from "@/drizzle/schema";
import { getPublicUrl } from "@/lib/r2";
import { getCurrentSession } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { user } = await getCurrentSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { imageId, postId } = body;

    if (!imageId || !postId) {
      return NextResponse.json(
        { error: "Missing required fields: imageId, postId" },
        { status: 400 }
      );
    }

    // Check if image exists and is in pending status
    const imageResults = await db
      .select()
      .from(imageTable)
      .where(eq(imageTable.id, imageId))
      .limit(1);

    if (imageResults.length === 0) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    const image = imageResults[0];

    if (image.status !== "pending") {
      return NextResponse.json(
        { error: "Image has already been confirmed or is not in pending state" },
        { status: 400 }
      );
    }

    // Update image status to completed
    const [updatedImage] = await db
      .update(imageTable)
      .set({ status: "completed" })
      .where(eq(imageTable.id, imageId))
      .returning();

    // Create post-image relationship
    await db
      .insert(postImageTable)
      .values({
        postId,
        imageId: updatedImage.id,
      })
      .onConflictDoNothing(); // In case it was already created

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
