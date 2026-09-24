import { NextRequest, NextResponse } from "next/server";
import { deleteSubscriptionByToken } from "@/lib/email/subscription";

// One-click unsubscribe (RFC 8058): mail clients POST here from the
// List-Unsubscribe header. Only POST, so link scanners can't trigger it.
export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  try {
    await deleteSubscriptionByToken(token);
  } catch (error) {
    console.error("Error in one-click unsubscribe:", error);
    return NextResponse.json({ error: "Failed to unsubscribe" }, { status: 500 });
  }

  // The same whether or not it was subscribed
  return new NextResponse(null, { status: 200 });
}
