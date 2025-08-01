import { Note, Context, PUBLIC_COLLECTION } from "@fedify/fedify";
import { Temporal } from "@js-temporal/polyfill";
import { postTable } from "@/drizzle/schema";
import type { ContextData } from "./core";

export function toDate(dateValue: any): Date | null {
  if (!dateValue) return null;
  if (dateValue instanceof Date) return dateValue;
  if (typeof dateValue === "string") return new Date(dateValue);
  return null;
}

export async function getNote(
  ctx: Context<ContextData>,
  post: typeof postTable.$inferSelect,
  blogSlug: string
) {
  const content = `<p>${post.title}</p>${post.content}`;

  const note = new Note({
    id: ctx.getObjectUri(Note, { id: post.id }),
    to: PUBLIC_COLLECTION,
    cc: ctx.getFollowersUri(blogSlug),
    content,
    attributions: [ctx.getActorUri(blogSlug)],
    url: new URL(
      `https://${process.env.NEXT_PUBLIC_DOMAIN!}/@${blogSlug}/${post.id}`
    ),
    published: post.published
      ? Temporal.Instant.fromEpochMilliseconds(post.published.getTime())
      : undefined,
    updated:
      post.published &&
      post.first_published &&
      +post.published > +post.first_published
        ? Temporal.Instant.fromEpochMilliseconds(post.published.getTime())
        : undefined,
  });
  return note;
}

async function getNodeInfo(url: string, options: { parse: string }) {
  try {
    const response = await fetch(new URL("/.well-known/nodeinfo", url));
    if (!response.ok) return null;

    const nodeInfoLinks = await response.json();
    const nodeInfoUrl = nodeInfoLinks.links?.find(
      (link: any) =>
        link.rel === "http://nodeinfo.diaspora.software/ns/schema/2.0"
    )?.href;

    if (!nodeInfoUrl) return null;

    const nodeInfoResponse = await fetch(nodeInfoUrl);
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
