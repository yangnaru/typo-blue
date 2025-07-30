import {
  createFederation,
  Person,
  Follow,
  Accept,
  Create,
  Update,
  Context,
  DocumentLoader,
  Link,
  Undo,
  InboxContext,
  Endpoints,
  getActorTypeName,
  PUBLIC_COLLECTION,
  Actor,
  Hashtag,
  Emoji,
  isActor,
  Note,
  Delete,
} from "@fedify/fedify";
import { PostgresKvStore, PostgresMessageQueue } from "@fedify/postgres";
import postgres from "postgres";
import { db } from "./db";
import {
  blog as blogTable,
  instanceTable,
  actorTable,
  followingTable,
  post as postTable,
} from "@/drizzle/schema";
import { eq, and, sql } from "drizzle-orm";
import { importJwk } from "@fedify/fedify";
import { getXForwardedRequest } from "x-forwarded-fetch";
import { Temporal, toTemporalInstant } from "@js-temporal/polyfill";
import { encodePostId } from "./utils";

// @ts-expect-error: toTemporalInstant is not typed on Date prototype
Date.prototype.toTemporalInstant = toTemporalInstant;

type Database = typeof db;

export type Instance = typeof instanceTable.$inferSelect;
export type NewInstance = typeof instanceTable.$inferInsert;

type PersistInstanceOptions = {
  skipUpdate?: boolean;
};

type ContextData = {
  db: Database;
  canonicalOrigin?: string;
};

function toDate(dateValue: any): Date | null {
  if (!dateValue) return null;
  if (dateValue instanceof Date) return dateValue;
  if (typeof dateValue === "string") return new Date(dateValue);
  return null;
}

async function getActorHandle(
  actor: Actor,
  options: { trimLeadingAt?: boolean } = {}
): Promise<string> {
  // Simple implementation - you may need to make this more robust
  const username = actor.name || actor.preferredUsername || "unknown";
  const domain = actor.id ? new URL(actor.id).host : "typo.blue";
  const handle = `${username}@${domain}`;
  return options.trimLeadingAt ? handle : `@${handle}`;
}

async function getPersistedActor(
  db: Database,
  iri: string
): Promise<
  | (typeof actorTable.$inferSelect & {
      instance: Instance;
      blog: typeof blogTable.$inferSelect | null;
      successor: typeof actorTable.$inferSelect | null;
    })
  | undefined
> {
  return await db.query.actorTable.findFirst({
    with: { instance: true, blog: true, successor: true },
    where: eq(actorTable.iri, iri),
  });
}

// Mock functions for getNodeInfo and formatSemVer - you'll need to implement these
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

function formatSemVer(version: string): string {
  if (!version) return "0.0.0";
  const parts = version.split(".");
  while (parts.length < 3) parts.push("0");
  return parts.slice(0, 3).join(".");
}

export async function persistInstance(
  db: Database,
  host: string,
  options: PersistInstanceOptions = {}
): Promise<typeof instanceTable.$inferSelect> {
  if (options.skipUpdate) {
    const instance = await db.query.instanceTable.findFirst({
      where: eq(instanceTable.host, host),
    });
    if (instance != null) return instance;
  }
  const nodeInfo = await getNodeInfo(`https://${host}/`, {
    parse: "best-effort",
  });
  const values: NewInstance = {
    host,
    software: nodeInfo?.software?.name ?? null,
    softwareVersion:
      nodeInfo?.software == null ||
      formatSemVer(nodeInfo.software.version) === "0.0.0"
        ? null
        : formatSemVer(nodeInfo.software.version),
  };
  const rows = await db
    .insert(instanceTable)
    .values(values)
    .onConflictDoUpdate({
      target: instanceTable.host,
      set: {
        ...values,
        updated: sql`CURRENT_TIMESTAMP`,
      },
      setWhere: eq(instanceTable.host, host),
    })
    .returning();
  return rows[0];
}

export async function persistActor(
  ctx: Context<ContextData>,
  actor: Actor,
  options: {
    contextLoader?: DocumentLoader;
    documentLoader?: DocumentLoader;
    outbox?: boolean;
  } = {}
): Promise<
  | (typeof actorTable.$inferSelect & {
      instance: Instance;
      blog: typeof blogTable.$inferSelect | null;
      successor: typeof actorTable.$inferSelect | null;
    })
  | undefined
> {
  if (actor.id == null) return undefined;
  else if (actor.inboxId == null) {
    return undefined;
  }
  if (actor.id.origin === ctx.canonicalOrigin) {
    return await getPersistedActor(ctx.data.db, actor.id.href);
  }
  const { db } = ctx.data;
  const instance = await persistInstance(db, actor.id.host);
  let handle: string;
  try {
    handle = await getActorHandle(actor, { trimLeadingAt: true });
  } catch (error) {
    return undefined;
  }
  const getterOpts = { ...options, suppressError: true };
  const [attachments, avatar, header, followees, followers] = await Promise.all(
    [
      Array.fromAsync(actor.getAttachments(getterOpts)),
      actor.getIcon(getterOpts),
      await actor.getImage(getterOpts),
      await actor.getFollowing(getterOpts),
      await actor.getFollowers(getterOpts),
    ]
  );
  const tags: Record<string, string> = {};
  const emojis: Record<string, string> = {};
  for await (const tag of actor.getTags(getterOpts)) {
    if (tag instanceof Hashtag) {
      if (tag.name == null || tag.href == null) continue;
      tags[tag.name.toString().toLowerCase()] = tag.href.href;
    } else if (tag instanceof Emoji) {
      if (tag.name == null) continue;
      const icon = await tag.getIcon(getterOpts);
      if (
        icon?.url == null ||
        (icon.url instanceof Link && icon.url.href == null)
      ) {
        continue;
      }
      emojis[tag.name.toString()] =
        icon.url instanceof URL ? icon.url.href : icon.url.href!.href;
    }
  }
  const successor = await actor.getSuccessor(getterOpts);
  const successorActor =
    successor != null && isActor(successor)
      ? await persistActor(ctx, successor, options)
      : null;
  const values: Omit<typeof actorTable.$inferInsert, "id"> = {
    iri: actor.id.href,
    type: getActorTypeName(actor),
    username: handle.substring(0, handle.indexOf("@")),
    instanceHost: instance.host,
    handleHost: handle.substring(handle.indexOf("@") + 1),
    name: actor.name?.toString(),
    bioHtml: actor.summary?.toString(),
    automaticallyApprovesFollowers: !actor.manuallyApprovesFollowers,
    inboxUrl: actor.inboxId.href,
    sharedInboxUrl: actor.endpoints?.sharedInbox?.href,
    followersUrl: actor.followersId?.href,
    featuredUrl: actor.featuredId?.href,
    avatarUrl:
      avatar?.url instanceof Link
        ? avatar.url.href?.href ?? null
        : avatar?.url?.href ?? null,
    headerUrl:
      header?.url instanceof Link
        ? header.url.href?.href ?? null
        : header?.url?.href ?? null,
    fieldHtmls: Object.fromEntries(
      attachments
        .filter((a: any) => a && a.type === "PropertyValue")
        .map((p: any) => [p.name || "", p.value || ""])
    ),
    emojis,
    tags,
    url:
      actor.url instanceof Link
        ? actor.url.href?.href ?? null
        : actor.url?.href ?? null,
    followeesCount: followees?.totalItems ?? 0,
    followersCount: followers?.totalItems ?? 0,
    aliases: actor.aliasIds?.map((a: any) => a.href) ?? [],
    successorId:
      successorActor == null || !successorActor.aliases.includes(actor.id.href)
        ? null
        : successorActor.id,
    blogId: null, // Remote actors don't have associated blogs
    sensitive: false,
    postsCount: 0,
    publicKeyPem: null, // Remote actors' keys aren't stored locally
    privateKeyPem: null,
    updated: toDate(actor.updated) ?? new Date(),
    published: toDate(actor.published) ?? null,
  };
  const insertValues = {
    ...values,
    id: crypto.randomUUID(),
    type: values.type as
      | "Person"
      | "Service"
      | "Group"
      | "Application"
      | "Organization",
  };
  await db
    .insert(actorTable)
    .values(insertValues)
    .onConflictDoUpdate({
      target: actorTable.iri,
      set: {
        ...values,
        type: values.type as
          | "Person"
          | "Service"
          | "Group"
          | "Application"
          | "Organization",
      },
      setWhere: eq(actorTable.iri, actor.id.href),
    });
}

async function getNote(
  ctx: Context<ContextData>,
  post: typeof postTable.$inferSelect,
  blogSlug: string
) {
  const content = `<p>${post.title}</p>${post.content}`;

  const note = new Note({
    id: ctx.getObjectUri(Note, { id: post.id }),
    to: PUBLIC_COLLECTION,
    cc: ctx.getFollowersUri(blogSlug),
    name: post.title,
    content,
    url: new URL(
      `https://${process.env.NEXT_PUBLIC_DOMAIN!}/@${blogSlug}/${encodePostId(
        post.id
      )}`
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

export async function sendNoteToFollowers(
  blogSlug: string,
  postId: string,
  isDelete: boolean = false,
  isUpdate: boolean = false
) {
  try {
    // Get blog and actor information
    const blogResult = await db
      .select({
        blog: blogTable,
        actor: actorTable,
      })
      .from(blogTable)
      .innerJoin(actorTable, eq(actorTable.blogId, blogTable.id))
      .where(eq(blogTable.slug, blogSlug))
      .limit(1);

    if (blogResult.length === 0) {
      console.log(`No ActivityPub actor found for blog: ${blogSlug}`);
      return;
    }

    const post = await db.query.post.findFirst({
      where: eq(postTable.id, postId),
    });

    console.log({ post });

    if (!post) {
      console.log(`No post found with id: ${postId}`);
      return;
    }

    // Create a temporary context for sending the activity
    const baseUrl = new URL(`https://${process.env.NEXT_PUBLIC_DOMAIN!}`);
    const context = federation.createContext(baseUrl, {
      db,
      canonicalOrigin: baseUrl.origin,
    });

    const note = await getNote(context, post, blogSlug);
    if (isDelete) {
      await context.sendActivity(
        { identifier: blogSlug },
        "followers",
        new Delete({
          id: new URL("#delete", note.id ?? context.origin),
          actor: context.getActorUri(blogSlug),
          object: note,
        }),
        { preferSharedInbox: true, excludeBaseUris: [new URL(context.origin)] }
      );
    } else if (isUpdate) {
      await context.sendActivity(
        { identifier: blogSlug },
        "followers",
        new Update({
          id: new URL("#update", note.id ?? context.origin),
          actor: context.getActorUri(blogSlug),
          object: note,
        }),
        { preferSharedInbox: true, excludeBaseUris: [new URL(context.origin)] }
      );
    } else {
      await context.sendActivity(
        { identifier: blogSlug },
        "followers",
        new Create({
          id: new URL("#create", note.id ?? context.origin),
          actors: [context.getActorUri(blogSlug)],
          object: note,
        }),
        { preferSharedInbox: true, excludeBaseUris: [new URL(context.origin)] }
      );
    }
    console.log(`Successfully sent note to followers for blog: ${blogSlug}`);
  } catch (error) {
    console.error("Error in sendNoteToFollowers:", error);
  }
}

export const fedifyRequestHandler = integrateFederation((request: Request) => ({
  db,
  canonicalOrigin: process.env.DOMAIN
    ? `https://${process.env.DOMAIN}`
    : undefined,
}));

const pg = postgres(process.env.DATABASE_URL!);
export const routePrefix = `/api/ap`;

export const federation = createFederation<ContextData>({
  kv: new PostgresKvStore(pg),
  queue: new PostgresMessageQueue(pg),
});

// Configure actor dispatcher for blogs
federation
  .setActorDispatcher(
    `${routePrefix}/users/{identifier}`,
    async (ctx, identifier) => {
      const result = await db
        .select({
          blog: blogTable,
          actor: actorTable,
        })
        .from(blogTable)
        .innerJoin(actorTable, eq(actorTable.blogId, blogTable.id))
        .where(eq(blogTable.slug, identifier))
        .limit(1);

      if (result.length === 0) return null;

      const { blog, actor } = result[0];

      return new Person({
        id: ctx.getActorUri(identifier),
        preferredUsername: blog.slug,
        name: blog.name,
        summary: blog.description,
        manuallyApprovesFollowers: false,
        publicKey: (await ctx.getActorKeyPairs(identifier))[0].cryptographicKey,
        inbox: ctx.getInboxUri(identifier),
        outbox: ctx.getOutboxUri(identifier),
        endpoints: new Endpoints({
          sharedInbox: ctx.getInboxUri(),
        }),
        following: ctx.getFollowingUri(identifier),
        followers: ctx.getFollowersUri(identifier),
        url: new URL(`/@${blog.slug}`, ctx.canonicalOrigin),
      });
    }
  )
  .setKeyPairsDispatcher(async (ctx, identifier) => {
    const { db } = ctx.data;

    // Find the blog and its associated actor
    const blogWithActor = await db.query.blog.findFirst({
      with: { actor: true },
      where: (blog, { eq }) => eq(blog.slug, identifier),
    });

    if (
      !blogWithActor?.actor ||
      !blogWithActor.actor.publicKeyPem ||
      !blogWithActor.actor.privateKeyPem
    ) {
      // No actor exists for this blog or no keys stored
      return [];
    }

    try {
      const { publicKeyPem, privateKeyPem } = blogWithActor.actor;

      // Import the JWK keys
      const privateKey = await importJwk(JSON.parse(privateKeyPem), "private");
      const publicKey = await importJwk(JSON.parse(publicKeyPem), "public");

      return [
        {
          privateKey,
          publicKey,
        },
      ];
    } catch (error) {
      console.error("Failed to import key pairs for actor:", identifier, error);
      return [];
    }
  });

export async function onUnfollowed(
  fedCtx: InboxContext<ContextData>,
  undo: Undo
) {
  const follow = await undo.getObject(fedCtx);
  if (!(follow instanceof Follow)) return;
  if (follow.id == null || follow.actorId?.href !== undo.actorId?.href) return;
  const actorObject = await undo.getActor(fedCtx);
  if (actorObject == null) return;
  const actor = await persistActor(fedCtx, actorObject, {
    ...fedCtx,
    outbox: false,
  });
  if (actor == null) return;
  const { db } = fedCtx.data;
  const rows = await db
    .delete(followingTable)
    .where(
      and(
        eq(followingTable.iri, follow.id.href),
        eq(followingTable.followerId, actor.id)
      )
    )
    .returning();
  if (rows.length < 1) {
    return;
  }
  const [following] = rows;
  await updateFolloweesCount(db, following.followerId, 1);
  await updateFollowersCount(db, following.followeeId, 1);
}

export async function updateFolloweesCount(
  db: Database,
  followerId: string,
  delta: number
): Promise<typeof actorTable.$inferSelect | undefined> {
  const rows = await db
    .update(actorTable)
    .set({
      followeesCount: sql`
      CASE WHEN ${actorTable.blogId} IS NULL
        THEN ${actorTable.followeesCount} + ${delta}
        ELSE (
          SELECT count(*)
          FROM ${followingTable}
          WHERE ${followingTable.followerId} = ${followerId}
            AND ${followingTable.accepted} IS NOT NULL
        )
      END
    `,
    })
    .where(eq(actorTable.id, followerId))
    .returning();
  return rows[0];
}

export async function updateFollowersCount(
  db: Database,
  followeeId: string,
  delta: number
): Promise<typeof actorTable.$inferSelect | undefined> {
  const rows = await db
    .update(actorTable)
    .set({
      followersCount: sql`
      CASE WHEN ${actorTable.blogId} IS NULL
        THEN ${actorTable.followersCount} + ${delta}
        ELSE (
          SELECT count(*)
          FROM ${followingTable}
          WHERE ${followingTable.followeeId} = ${followeeId}
            AND ${followingTable.accepted} IS NOT NULL
        )
      END
    `,
    })
    .where(eq(actorTable.id, followeeId))
    .returning();
  return rows[0];
}

// Configure inbox listener for follow activities
federation
  .setInboxListeners(`${routePrefix}/users/{identifier}/inbox`, `/inbox`)
  .on(Undo, async (ctx, undo) => {
    const object = await undo.getObject({ ...ctx, suppressError: true });
    if (object instanceof Follow) await onUnfollowed(ctx, undo);
  })
  .on(Follow, async (fedCtx, follow) => {
    if (follow.id == null || follow.objectId == null) return;
    const followObject = fedCtx.parseUri(follow.objectId);
    if (followObject?.type !== "actor") return;
    const { db } = fedCtx.data;
    const followee = await db.query.blog.findFirst({
      with: { actor: true },
      where: (blog, { eq }) => eq(blog.slug, followObject.identifier),
    });
    console.log("followee", followee);
    if (followee == null) return;
    const followActor = await follow.getActor(fedCtx);
    if (followActor == null) return;
    const follower = await persistActor(fedCtx, followActor, {
      ...fedCtx,
      outbox: false,
    });
    if (follower == null) return;
    const rows = await db
      .insert(followingTable)
      .values({
        iri: follow.id.href,
        followerId: follower.id,
        followeeId: followee.actor.id,
        accepted: sql`CURRENT_TIMESTAMP`,
      })
      .onConflictDoNothing()
      .returning();
    console.log({ rows });
    if (rows.length < 1) return;
    await updateFolloweesCount(db, follower.id!.toString(), 1);
    await updateFollowersCount(db, followee.actor.id, 1);
    await fedCtx.sendActivity(
      { identifier: followee.slug },
      followActor,
      new Accept({
        id: new URL(
          `#accept/${follower.id}/${+rows[0].accepted!}`,
          fedCtx.getActorUri(followee.slug)
        ),
        actor: fedCtx.getActorUri(followee.slug),
        object: follow,
      }),
      { excludeBaseUris: [new URL(fedCtx.origin)] }
    );
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

    // Convert posts to ActivityPub Articles using getArticle
    const articles = await Promise.all(
      posts.map((post) => getNote(ctx, post, identifier))
    );
    const createArticles = articles.map(
      (article) =>
        new Create({
          id: new URL("#create", article.id ?? ctx.origin),
          actors: [ctx.getActorUri(identifier)],
          object: article,
        })
    );
    return { items: createArticles };
  }
);

// Configure followers dispatcher
federation.setFollowersDispatcher(
  `${routePrefix}/users/{identifier}/followers`,
  async (ctx, identifier, cursor) => {
    // Get the local actor for this identifier
    const localActor = await db
      .select({ id: actorTable.id })
      .from(blogTable)
      .innerJoin(actorTable, eq(actorTable.blogId, blogTable.id))
      .where(eq(blogTable.slug, identifier))
      .limit(1);

    if (localActor.length === 0) return { items: [] };

    // Fetch followers from new followingTable
    const followers = await db
      .select({
        followerActor: actorTable,
      })
      .from(followingTable)
      .innerJoin(actorTable, eq(followingTable.followerId, actorTable.id))
      .where(
        and(
          eq(followingTable.followeeId, localActor[0].id),
          // Only include accepted follows (non-null accepted field)
          sql`${followingTable.accepted} IS NOT NULL`
        )
      );

    return {
      items: followers.map((f) => ({
        id: new URL(f.followerActor.iri),
        inboxId: new URL(f.followerActor.inboxUrl),
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

federation.setObjectDispatcher(
  Note,
  `${routePrefix}/notes/{id}`,
  async (ctx, values) => {
    const post = await ctx.data.db.query.post.findFirst({
      where: eq(postTable.id, values.id),
    });
    if (post == null) return null;
    return await getNote(ctx, post, post.blogId);
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
