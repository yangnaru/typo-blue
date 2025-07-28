import { federation, initializeFederation } from "@/lib/federation";

export async function GET(request: Request) {
  try {
    await initializeFederation();
    return await federation.fetch(request, { contextData: undefined });
  } catch (error) {
    console.error("ActivityPub GET error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await initializeFederation();
    return await federation.fetch(request, { contextData: undefined });
  } catch (error) {
    console.error("ActivityPub POST error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}