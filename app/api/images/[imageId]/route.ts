import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { imageTable } from "@/drizzle/schema";
import { deleteFromR2 } from "@/lib/r2";
import { eq } from "drizzle-orm";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ imageId: string }> }
) {
  try {
    const { imageId } = await params;

    // Get image metadata first
    const [image] = await db
      .select()
      .from(imageTable)
      .where(eq(imageTable.id, imageId))
      .limit(1);

    if (!image) {
      return NextResponse.json(
        { error: "Image not found" },
        { status: 404 }
      );
    }

    // Delete from R2 first
    await deleteFromR2(image.key);

    // Then delete from database
    await db
      .delete(imageTable)
      .where(eq(imageTable.id, imageId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting image:", error);
    return NextResponse.json(
      { error: "Failed to delete image" },
      { status: 500 }
    );
  }
}
