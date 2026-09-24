import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emailQueue as emailQueueTable } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { isUuid } from "@/lib/utils";

// Emails only link to this site, so refuse to redirect anywhere else
function parseRedirectUrl(url: string) {
  const siteUrl = process.env.NEXT_PUBLIC_URL;
  if (!siteUrl) return null;
  try {
    const target = new URL(url, siteUrl);
    return target.origin === new URL(siteUrl).origin ? target : null;
  } catch {
    return null;
  }
}

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

  const target = parseRedirectUrl(url);
  if (!target) {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  if (isUuid(jobId)) {
    try {
      // Update the email job with click timestamp
      await db
        .update(emailQueueTable)
        .set({ clickedAt: new Date() })
        .where(eq(emailQueueTable.id, jobId));
    } catch (error) {
      // Still redirect even if tracking fails
      console.error("Error tracking email click:", error);
    }
  }

  return NextResponse.redirect(target);
}
