import { db } from "./db";
import { blog as blogTable, actorTable, instanceTable } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { generateCryptoKeyPair, exportJwk } from "@fedify/fedify";
import { routePrefix } from "./federation";

export interface CreateActorParams {
  blogId: string;
  blogSlug: string;
  name?: string;
  summary?: string;
  domain: string;
}

export async function createActivityPubActor(params: CreateActorParams) {
  const { blogId, blogSlug, name, summary, domain } = params;

  // Generate key pair for the actor
  const keyPair = await generateCryptoKeyPair();
  const publicKeyPem = JSON.stringify(await exportJwk(keyPair.publicKey));
  const privateKeyPem = JSON.stringify(await exportJwk(keyPair.privateKey));

  const handle = `@${blogSlug}@${domain}`;
  const uri = `https://${domain}${routePrefix}/users/${blogSlug}`;
  const inboxUrl = `https://${domain}${routePrefix}/users/${blogSlug}/inbox`;
  const outboxUrl = `https://${domain}${routePrefix}/users/${blogSlug}/outbox`;
  const followersUrl = `https://${domain}${routePrefix}/users/${blogSlug}/followers`;
  const followingUrl = `https://${domain}${routePrefix}/users/${blogSlug}/following`;
  const url = `https://${domain}${routePrefix}/users/${blogSlug}`;
  const featuredUrl = `https://${domain}${routePrefix}/users/${blogSlug}/collections/featured`;
  const sharedInboxUrl = `https://${domain}${routePrefix}/inbox`;

  // if instance_host does not exist, upsert it
  await db
    .insert(instanceTable)
    .values({
      host: domain,
      updated: new Date(),
    })
    .onConflictDoNothing();

  const actor = await db
    .insert(actorTable)
    .values({
      id: crypto.randomUUID(),
      type: "Person",
      username: blogSlug,
      instanceHost: domain,
      handleHost: domain,
      iri: uri,
      name: name || blogSlug,
      bioHtml: summary,
      inboxUrl,
      blogId: blogId,
      followersUrl,
      featuredUrl,
      fieldHtmls: {},
      emojis: {},
      tags: {},
      aliases: [],
      published: new Date(),
      automaticallyApprovesFollowers: true,
      sharedInboxUrl,
      url,
      publicKeyPem,
      privateKeyPem,
    })
    .returning();

  return actor[0];
}

export async function getActorForBlog(blogId: string) {
  // Check if actor exists without creating one
  const existingActor = await db
    .select()
    .from(actorTable)
    .where(eq(actorTable.blogId, blogId))
    .limit(1);

  return existingActor.length > 0 ? existingActor[0] : null;
}

export async function getOrCreateActorForBlog(blogId: string, domain: string) {
  // Check if actor already exists
  const existingActor = await getActorForBlog(blogId);

  if (existingActor) {
    return existingActor;
  }

  // Get blog details
  const blog = await db
    .select()
    .from(blogTable)
    .where(eq(blogTable.id, blogId))
    .limit(1);

  if (blog.length === 0) {
    throw new Error("Blog not found");
  }

  const blogData = blog[0];

  return await createActivityPubActor({
    blogId,
    blogSlug: blogData.slug,
    name: blogData.name || blogData.slug,
    summary: blogData.description || undefined,
    domain,
  });
}

export async function getActorByUri(uri: string) {
  return await db
    .select()
    .from(actorTable)
    .where(eq(actorTable.iri, uri))
    .limit(1);
}
