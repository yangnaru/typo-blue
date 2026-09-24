import { Context } from "@fedify/fedify";
import { Note, PUBLIC_COLLECTION } from "@fedify/vocab";
import { Temporal as TemporalPolyfill } from "@js-temporal/polyfill";
import { actorTable, postTable } from "@/drizzle/schema";
import type { ContextData } from "./core";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { escapeHtml } from "../utils";
import { sanitizePostHtml } from "../sanitize";

// Node.js has no native Temporal yet, so build Instants with the polyfill
// (as Fedify does) and type them as the global Temporal that Fedify expects.
function toInstant(date: Date): Temporal.Instant {
  return TemporalPolyfill.Instant.fromEpochMilliseconds(
    date.getTime()
  ) as unknown as Temporal.Instant;
}

export function toDate(
  dateValue: Date | string | Temporal.Instant | null | undefined
): Date | null {
  if (!dateValue) return null;
  if (dateValue instanceof Date) return dateValue;
  if (typeof dateValue === "string") return new Date(dateValue);
  return new Date(dateValue.epochMilliseconds);
}

export async function getNote(
  ctx: Context<ContextData>,
  post: typeof postTable.$inferSelect,
  blogId: string
) {
  const actor = await db.query.actorTable.findFirst({
    where: eq(actorTable.blogId, blogId),
    with: { blog: true },
  });
  if (!actor) return null;
  if (!actor.blog) return null;

  const content = `<p>${escapeHtml(post.title ?? "")}</p>${sanitizePostHtml(
    post.content ?? ""
  )}`;
  const note = new Note({
    id: ctx.getObjectUri(Note, { id: post.id }),
    to: PUBLIC_COLLECTION,
    cc: ctx.getFollowersUri(actor.blog.slug),
    content,
    attributions: [ctx.getActorUri(actor.blog.slug)],
    url: new URL(
      `https://${process.env.NEXT_PUBLIC_DOMAIN!}/@${actor.blog.slug}/${
        post.id
      }`
    ),
    // post.published moves on every edit of a published post
    published: (post.first_published ?? post.published)
      ? toInstant((post.first_published ?? post.published)!)
      : undefined,
    updated:
      post.published &&
      post.first_published &&
      +post.published > +post.first_published
        ? toInstant(post.published)
        : undefined,
  });
  return note;
}

async function getNodeInfo(url: string) {
  try {
    const wellKnownUrl = new URL("/.well-known/nodeinfo", url);
    const response = await fetch(wellKnownUrl, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;

    const nodeInfoLinks = await response.json();
    const href = nodeInfoLinks.links?.find(
      (link: { rel?: string; href?: string }) =>
        link.rel === "http://nodeinfo.diaspora.software/ns/schema/2.0"
    )?.href;

    if (!href) return null;

    // Only follow it on the same host, so a remote server can't point us at
    // an internal address
    const nodeInfoUrl = new URL(href, wellKnownUrl);
    if (
      nodeInfoUrl.protocol !== "https:" ||
      nodeInfoUrl.host !== wellKnownUrl.host
    ) {
      return null;
    }

    const nodeInfoResponse = await fetch(nodeInfoUrl, {
      signal: AbortSignal.timeout(5000),
    });
    if (!nodeInfoResponse.ok) return null;

    return await nodeInfoResponse.json();
  } catch {
    return null;
  }
}

export function formatSemVer(version: string): string {
  if (!version) return "0.0.0";
  const parts = version.split(".");
  while (parts.length < 3) parts.push("0");
  return parts.slice(0, 3).join(".");
}

export { getNodeInfo };
