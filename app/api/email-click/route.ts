import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emailQueue as emailQueueTable } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("id");
  const url = searchParams.get("url");

  if (!jobId || !url) {
    return NextResponse.json(
      { error: "Missing required parameters" },
      { status: 400 }
    );
  }

  try {
    // Update the email job with click timestamp
    await db
      .update(emailQueueTable)
      .set({ clickedAt: new Date() })
      .where(eq(emailQueueTable.id, jobId));

    // Redirect to the original URL
    return NextResponse.redirect(decodeURIComponent(url));
  } catch (error) {
    console.error("Error tracking email click:", error);
    
    // Still redirect even if tracking fails
    return NextResponse.redirect(decodeURIComponent(url));
  }
}