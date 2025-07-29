import { NextRequest, NextResponse } from "next/server";
import { trackPageView } from "@/lib/actions/analytics";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { blogId, postId, userAgent, referrer, path } = body as {
      blogId: string;
      postId: string;
      userAgent: string;
      referrer: string;
      path: string;
    };

    if (!blogId || !path) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get the real IP address, handling various proxy scenarios
    const forwardedFor = request.headers.get("x-forwarded-for");
    const realIp = request.headers.get("x-real-ip");
    const cfConnectingIp = request.headers.get("cf-connecting-ip");

    let ipAddress = "127.0.0.1";

    if (cfConnectingIp) {
      ipAddress = cfConnectingIp;
    } else if (realIp) {
      ipAddress = realIp;
    } else if (forwardedFor) {
      // x-forwarded-for can contain multiple IPs, take the first one
      ipAddress = forwardedFor.split(",")[0].trim();
    }

    // Convert IPv4 to IPv6 format if needed
    if (ipAddress.includes(".") && !ipAddress.includes(":")) {
      // Convert IPv4 to IPv4-mapped IPv6
      const parts = ipAddress.split(".");
      if (
        parts.length === 4 &&
        parts.every((part) => {
          const num = parseInt(part);
          return !isNaN(num) && num >= 0 && num <= 255;
        })
      ) {
        ipAddress = `::ffff:${ipAddress}`;
      }
    }

    await trackPageView(blogId, postId, ipAddress, userAgent, referrer, path);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error tracking page view:", error);
    return NextResponse.json(
      { error: "Failed to track page view" },
      { status: 500 }
    );
  }
}
