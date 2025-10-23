import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { imageTable, postImageTable } from "@/drizzle/schema";
import { uploadToR2, getPublicUrl } from "@/lib/r2";
import { randomUUID } from "crypto";
import sharp from "sharp";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const postId = formData.get("postId") as string;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (!postId) {
      return NextResponse.json(
        { error: "No postId provided" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed." },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 }
      );
    }

    // Get image dimensions using sharp
    const buffer = Buffer.from(await file.arrayBuffer());
    const metadata = await sharp(buffer).metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;

    // Generate unique key for R2 with sharding
    const imageId = randomUUID();
    const shard = imageId.slice(0, 2); // First 2 characters for sharding
    const ext = file.name.split(".").pop() || "jpg";
    const key = `images/${shard}/${imageId}.${ext}`;

    // Upload to R2
    const url = await uploadToR2(file, key);

    // Save image metadata to database
    const [image] = await db
      .insert(imageTable)
      .values({
        width,
        height,
        filename: file.name,
        key,
      })
      .returning();

    // Create junction table entry linking image to post
    await db
      .insert(postImageTable)
      .values({
        postId,
        imageId: image.id,
      });

    return NextResponse.json({
      id: image.id,
      url,
      width,
      height,
      filename: file.name,
      key,
    });
  } catch (error) {
    console.error("Error uploading image:", error);
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 }
    );
  }
}
