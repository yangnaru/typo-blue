import {
  createFederation,
  Person,
  Article,
  Note,
  Follow,
  Accept,
  Reject,
  MemoryKvStore,
  InProcessMessageQueue,
} from "@fedify/fedify";
import { PostgresMessageQueue } from "@fedify/postgres";
import { configure, getConsoleSink } from "@logtape/logtape";
import postgres from "postgres";
import { db } from "./db";
import {
  activityPubActor,
  activityPubRemoteActor,
  activityPubFollow,
  activityPubActivity,
  user as userTable,
  blog as blogTable,
} from "@/drizzle/schema";
import { eq, and } from "drizzle-orm";
import { generateCryptoKeyPair, exportJwk, importJwk } from "@fedify/fedify";
import { getXForwardedRequest } from "x-forwarded-fetch";

export const fedifyRequestHandler = integrateFederation(() => {});

// Create message queue - use in-process for development, PostgreSQL for production
let messageQueue;
if (process.env.NODE_ENV === "production" && process.env.DATABASE_URL) {
  const sql = postgres(process.env.DATABASE_URL);
  messageQueue = new PostgresMessageQueue(sql);
} else {
  messageQueue = new InProcessMessageQueue();
}

const routePrefix = `/api/ap`;

export const federation = createFederation<void>({
  kv: new MemoryKvStore(),
  queue: messageQueue,
});

// Configure actor dispatcher for blogs
federation
  .setActorDispatcher(
    `${routePrefix}/users/{identifier}`,
    async (ctx, identifier) => {
      const result = await db
        .select({
          blog: blogTable,
          actor: activityPubActor,
        })
        .from(blogTable)
        .innerJoin(activityPubActor, eq(activityPubActor.blogId, blogTable.id))
        .where(eq(blogTable.slug, identifier))
        .limit(1);

      if (result.length === 0) return null;

      const { blog, actor } = result[0];

      return new Person({
        id: ctx.getActorUri(identifier),
        preferredUsername: identifier,
        name: actor.name || blog.name || blog.slug,
        summary: actor.summary || blog.description,
        icon: actor.iconUrl ? new URL(actor.iconUrl) : undefined,
        inbox: ctx.getInboxUri(identifier),
        outbox: ctx.getOutboxUri(identifier),
        followers: ctx.getFollowersUri(identifier),
        following: ctx.getFollowingUri(identifier),
        url: new URL(`/@${identifier}`, ctx.origin),
        publicKey: (await ctx.getActorKeyPairs(identifier))[0].cryptographicKey,
      });
    }
  )
  .setKeyPairsDispatcher(async (ctx, identifier) => {
    const result = await db
      .select({
        publicKeyPem: activityPubActor.publicKeyPem,
        privateKeyPem: activityPubActor.privateKeyPem,
      })
      .from(blogTable)
      .innerJoin(activityPubActor, eq(activityPubActor.blogId, blogTable.id))
      .where(eq(blogTable.slug, identifier))
      .limit(1);

    if (result.length === 0) {
      // No actor exists for this blog
      return [];
    }

    const { publicKeyPem, privateKeyPem } = result[0];

    return [
      {
        privateKey: await importJwk(JSON.parse(privateKeyPem), "private"),
        publicKey: await importJwk(JSON.parse(publicKeyPem), "public"),
      },
    ];
  });

// Configure inbox listener for follow activities
federation
  .setInboxListeners(`${routePrefix}/users/{identifier}/inbox`, `/inbox`)
  .on(Follow, async (ctx, follow) => {
    const followerId = follow.actorId?.href;
    const followingId = follow.objectId?.href;

    if (!followerId || !followingId) return;

    // Extract identifier from the target actor URI
    const targetUri = follow.objectId?.href;
    if (!targetUri) return;

    // Store the follow request
    await db.insert(activityPubFollow).values({
      id: crypto.randomUUID(),
      activityId: follow.id?.href || crypto.randomUUID(),
      actorId: null, // This would be the local actor ID if following a local user
      remoteActorId: null, // This would be populated after actor lookup
      state: "pending",
      created: new Date(),
      updated: new Date(),
    });

    // Auto-accept follow requests for now
    const accept = new Accept({
      id: new URL(`${ctx.origin}/activities/${crypto.randomUUID()}`),
      actor: follow.objectId,
      object: follow,
    });

    // For now, we'll skip sending the activity
    // This would need proper actor lookup to get the identifier
    // await ctx.sendActivity({ identifier: "me" }, follow.actorId!, accept);

    // Update follow state to accepted
    await db
      .update(activityPubFollow)
      .set({ state: "accepted", updated: new Date() })
      .where(eq(activityPubFollow.activityId, follow.id?.href || ""));
  });

// Configure outbox dispatcher for posts
federation.setOutboxDispatcher(
  `${routePrefix}/users/{identifier}/outbox`,
  async (ctx, identifier, cursor) => {
    // Fetch posts from the blog and return them as ActivityPub objects
    const blogResult = await db
      .select({ blogId: blogTable.id })
      .from(blogTable)
      .where(eq(blogTable.slug, identifier))
      .limit(1);

    if (blogResult.length === 0) return { items: [] };

    const posts = await db.query.post.findMany({
      where: (post, { eq, and, isNotNull }) =>
        and(
          eq(post.blogId, blogResult[0].blogId),
          isNotNull(post.published),
          isNotNull(post.content)
        ),
      orderBy: (post, { desc }) => desc(post.published),
      limit: 20,
    });

    // Convert posts to ActivityPub Articles/Notes
    // For now, return empty collection
    return { items: [] };
  }
);

// Configure followers dispatcher
federation.setFollowersDispatcher(
  `${routePrefix}/users/{identifier}/followers`,
  async (ctx, identifier, cursor) => {
    // Fetch followers from database
    const followers = await db
      .select()
      .from(activityPubFollow)
      .innerJoin(
        activityPubRemoteActor,
        eq(activityPubFollow.remoteActorId, activityPubRemoteActor.id)
      )
      .where(
        and(
          eq(activityPubFollow.state, "accepted")
          // Would need to join with local actor based on identifier
        )
      );

    return {
      items: followers.map((f) => ({
        id: new URL(f.activitypub_remote_actor.uri),
        inboxId: new URL(f.activitypub_remote_actor.inboxUrl),
      })),
    };
  }
);

// Configure following dispatcher
federation.setFollowingDispatcher(
  `${routePrefix}/users/{identifier}/following`,
  async (ctx, identifier, cursor) => {
    // Blogs typically don't follow other accounts, but this could be implemented
    return { items: [] };
  }
);

export default federation;

function integrateFederation<TContextData>(
  contextDataFactory: (request: Request) => TContextData | Promise<TContextData>
) {
  return async (request: Request) => {
    const forwardedRequest = await getXForwardedRequest(request);
    const contextData = await contextDataFactory(forwardedRequest);
    return await federation.fetch(forwardedRequest, {
      contextData: contextData as any,
      onNotFound: () => {
        return new Response("Not found", { status: 404 }); // unused
      },
      onNotAcceptable: () => {
        return new Response("Not acceptable", {
          status: 406,
          headers: {
            "Content-Type": "text/plain",
            Vary: "Accept",
          },
        });
      },
    });
  };
}
