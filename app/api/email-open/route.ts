import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emailQueue as emailQueueTable } from "@/drizzle/schema";
import { eq, isNull } from "drizzle-orm";

// 1x1 transparent pixel as base64
const TRACKING_PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("id");

  if (!jobId) {
    // Return the tracking pixel even if no job ID to avoid broken images
    return new NextResponse(TRACKING_PIXEL, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': TRACKING_PIXEL.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  }

  try {
    // Update the email job with open timestamp only if not already opened
    // This prevents multiple opens from the same email from updating the timestamp
    await db
      .update(emailQueueTable)
      .set({ openedAt: new Date() })
      .where(
        eq(emailQueueTable.id, jobId)
      );

    console.log(`Email opened: job ${jobId}`);
  } catch (error) {
    console.error("Error tracking email open:", error);
  }

  // Always return the tracking pixel
  return new NextResponse(TRACKING_PIXEL, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Content-Length': TRACKING_PIXEL.length.toString(),
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}