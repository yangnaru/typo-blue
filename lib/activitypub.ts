import { db } from "./db";
import { 
  activityPubActor, 
  activityPubRemoteActor,
  user as userTable,
  blog as blogTable
} from "@/drizzle/schema";
import { eq, and } from "drizzle-orm";
import { generateCryptoKeyPair, exportJwk } from "@fedify/fedify";

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
  const uri = `https://${domain}/@${blogSlug}`;
  const inboxUrl = `https://${domain}/@${blogSlug}/inbox`;
  const outboxUrl = `https://${domain}/@${blogSlug}/outbox`;
  const followersUrl = `https://${domain}/@${blogSlug}/followers`;
  const followingUrl = `https://${domain}/@${blogSlug}/following`;
  
  const actor = await db.insert(activityPubActor).values({
    id: crypto.randomUUID(),
    blogId,
    handle,
    uri,
    name: name || blogSlug,
    summary,
    publicKeyPem,
    privateKeyPem,
    inboxUrl,
    outboxUrl,
    followersUrl,
    followingUrl,
    created: new Date(),
    updated: new Date(),
  }).returning();
  
  return actor[0];
}

export async function getActorForBlog(blogId: string) {
  // Check if actor exists without creating one
  const existingActor = await db
    .select()
    .from(activityPubActor)
    .where(eq(activityPubActor.blogId, blogId))
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

export async function getActorByHandle(handle: string) {
  return await db
    .select()
    .from(activityPubActor)
    .where(eq(activityPubActor.handle, handle))
    .limit(1);
}

export async function getActorByUri(uri: string) {
  return await db
    .select()
    .from(activityPubActor)
    .where(eq(activityPubActor.uri, uri))
    .limit(1);
}

export async function getRemoteActorByUri(uri: string) {
  return await db
    .select()
    .from(activityPubRemoteActor)
    .where(eq(activityPubRemoteActor.uri, uri))
    .limit(1);
}

export async function createOrUpdateRemoteActor(actorData: {
  uri: string;
  handle?: string;
  name?: string;
  summary?: string;
  iconUrl?: string;
  publicKeyPem?: string;
  inboxUrl: string;
  outboxUrl?: string;
  followersUrl?: string;
  followingUrl?: string;
  sharedInboxUrl?: string;
}) {
  const existing = await getRemoteActorByUri(actorData.uri);
  
  if (existing.length > 0) {
    // Update existing actor
    const updated = await db
      .update(activityPubRemoteActor)
      .set({
        ...actorData,
        updated: new Date(),
        lastFetched: new Date(),
      })
      .where(eq(activityPubRemoteActor.uri, actorData.uri))
      .returning();
    
    return updated[0];
  } else {
    // Create new remote actor
    const created = await db
      .insert(activityPubRemoteActor)
      .values({
        id: crypto.randomUUID(),
        ...actorData,
        created: new Date(),
        updated: new Date(),
        lastFetched: new Date(),
      })
      .returning();
    
    return created[0];
  }
}

export function getActivityPubDomain(): string {
  // In production, this should come from environment variables
  return process.env.ACTIVITYPUB_DOMAIN || process.env.VERCEL_URL || "localhost:3000";
}