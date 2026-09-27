import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { imageTable, postImageTable, postTable, blog } from "@/drizzle/schema";
import { generatePresignedUploadUrl, getPublicUrl } from "@/lib/r2";
import { getCurrentSession } from "@/lib/auth";
import { IMAGE_EXTENSIONS, MAX_IMAGE_SIZE } from "@/lib/images";
import { isUuid } from "@/lib/utils";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";

const MAX_DIMENSION = 50_000;
const MAX_FILENAME_LENGTH = 255;

function isDimension(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) > 0 && (value as number) <= MAX_DIMENSION;
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { user } = await getCurrentSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { postId, filename, width, height, contentType, size } = body;

    if (
      typeof postId !== "string" ||
      !isUuid(postId) ||
      typeof filename !== "string" ||
      filename.length === 0 ||
      !isDimension(width) ||
      !isDimension(height) ||
      typeof contentType !== "string" ||
      !Number.isInteger(size)
    ) {
      return NextResponse.json(
        {
          error:
            "Missing or invalid fields: postId, filename, width, height, contentType, size",
        },
        { status: 400 }
      );
    }

    // Validate file type
    const ext = IMAGE_EXTENSIONS[contentType];
    if (!ext) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed." },
        { status: 400 }
      );
    }

    // Validate file size. The upload link is signed for exactly this size, so
    // the file R2 accepts can be no bigger.
    if (size <= 0 || size > MAX_IMAGE_SIZE) {
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
    const key = `images/${shard}/${imageId}.${ext}`;

    // Create the image, pending, already tied to its post, so only this post's
    // owner can confirm it and deleting the post, blog or account finds it
    await db.transaction(async (tx) => {
      await tx.insert(imageTable).values({
        id: imageId,
        width,
        height,
        filename: filename.slice(0, MAX_FILENAME_LENGTH),
        key,
        status: "pending",
      });
      await tx.insert(postImageTable).values({ postId, imageId });
    });

    // Generate presigned PUT URL
    const { url } = await generatePresignedUploadUrl(key, contentType, size);

    return NextResponse.json({
      presignedUrl: url,
      imageId,
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
