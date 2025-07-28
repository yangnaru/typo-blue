import { db } from "../../../lib/db";
import { blog as blogTable, activityPubActor } from "../../../drizzle/schema";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const resource = searchParams.get("resource");

  if (!resource) {
    return new Response("Missing resource parameter", { status: 400 });
  }

  // Parse resource (e.g., "acct:blog@domain.com")
  const match = resource.match(/^acct:([^@]+)@(.+)$/);
  if (!match) {
    return new Response("Invalid resource format", { status: 400 });
  }

  const [, blogSlug, domain] = match;
  const requestDomain = request.nextUrl.hostname;

  // Check if this is for our domain using process.env.ACTIVITYPUB_DOMAIN
  const activitypubDomain = process.env.ACTIVITYPUB_DOMAIN;
  if (!activitypubDomain || domain !== activitypubDomain) {
    return new Response("Domain not handled by this server", { status: 404 });
  }

  // Look up blog in database
  const result = await db
    .select({
      blog: blogTable,
    })
    .from(blogTable)
    .innerJoin(activityPubActor, eq(activityPubActor.blogId, blogTable.id))
    .where(eq(blogTable.slug, blogSlug))
    .limit(1);

  if (result.length === 0) {
    return new Response("Blog not found", { status: 404 });
  }

  const origin = `${request.nextUrl.protocol}//${request.nextUrl.host}`;

  const webfingerResponse = {
    subject: resource,
    links: [
      {
        rel: "self",
        type: "application/activity+json",
        href: `${origin}/@${blogSlug}`,
      },
      {
        rel: "http://webfinger.net/rel/profile-page",
        type: "text/html",
        href: `${origin}/@${blogSlug}`,
      },
    ],
  };

  return new Response(JSON.stringify(webfingerResponse), {
    headers: {
      "Content-Type": "application/jrd+json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
