import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { imageTable, postTable, blog } from "@/drizzle/schema";
import { generatePresignedUploadUrl, getPublicUrl } from "@/lib/r2";
import { getCurrentSession } from "@/lib/auth";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { user } = await getCurrentSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { postId, filename, width, height, contentType, size } = body;

    if (!postId || !filename || width === undefined || height === undefined || !contentType) {
      return NextResponse.json(
        { error: "Missing required fields: postId, filename, width, height, contentType" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(contentType)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed." },
        { status: 400 }
      );
    }

    // Validate file size
    if (size && size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
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
        { error: "You don't have permission to upload images to this post" },
        { status: 403 }
      );
    }

    // Generate unique key for R2 with sharding
    const imageId = randomUUID();
    const shard = imageId.slice(0, 2); // First 2 characters for sharding
    const ext = filename.split(".").pop() || "jpg";
    const key = `images/${shard}/${imageId}.${ext}`;

    // Create image record in DB with status='pending'
    const [image] = await db
      .insert(imageTable)
      .values({
        id: imageId,
        width,
        height,
        filename,
        key,
        status: "pending",
      })
      .returning();

    // Generate presigned PUT URL
    const { url } = await generatePresignedUploadUrl(key, contentType);

    return NextResponse.json({
      presignedUrl: url,
      imageId: image.id,
      key,
      publicUrl: getPublicUrl(key),
    });
  } catch (error) {
    console.error("Error generating presigned upload URL:", error);
    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status: 500 }
    );
  }
}
