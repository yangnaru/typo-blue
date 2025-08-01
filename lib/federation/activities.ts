import {
  Follow,
  Accept,
  Create,
  Update,
  InboxContext,
  Undo,
  Note,
  Delete,
  Article,
  Mention,
  Announce,
  EmojiReact,
  Like,
  PUBLIC_COLLECTION,
  Person,
  Endpoints,
} from "@fedify/fedify";
import { db } from "../db";
import {
  blog as blogTable,
  actorTable,
  followingTable,
  postTable,
  notificationTable,
} from "@/drizzle/schema";
import { eq, and, sql } from "drizzle-orm";
import {
  persistActor,
  updateFolloweesCount,
  updateFollowersCount,
} from "./actors";
import { getNote } from "./utils";
import { getActorByUri } from "../activitypub";
import type { ContextData } from "./core";
import { federation } from "./core";

export type PostObject = Article | Note;

export function isPostObject(object: unknown): object is Note {
  return object instanceof Note;
}

export async function sendActorUpdateToFollowers(
  blogSlug: string,
  name?: string | null,
  bioHtml?: string | null
) {
  try {
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

    const { blog, actor } = blogResult[0];

    const updateData: {
      name?: string | null;
      bioHtml?: string | null;
      updated: Date;
    } = {
      updated: new Date(),
    };

    if (name !== undefined) {
      updateData.name = name;
    }
    if (bioHtml !== undefined) {
      updateData.bioHtml = bioHtml;
    }

    await db
      .update(actorTable)
      .set(updateData)
      .where(eq(actorTable.id, actor.id));

    const baseUrl = new URL(`https://${process.env.NEXT_PUBLIC_DOMAIN!}`);
    const context = federation.createContext(baseUrl, {
      db,
      canonicalOrigin: baseUrl.origin,
    });

    const updatedPerson = new Person({
      id: context.getActorUri(blogSlug),
      preferredUsername: blog.slug,
      name: updateData.name !== undefined ? updateData.name : blog.name,
      summary:
        updateData.bioHtml !== undefined
          ? updateData.bioHtml
          : blog.description,
      manuallyApprovesFollowers: false,
      publicKey: (await context.getActorKeyPairs(blogSlug))[0].cryptographicKey,
      inbox: context.getInboxUri(blogSlug),
      outbox: context.getOutboxUri(blogSlug),
      endpoints: new Endpoints({
        sharedInbox: context.getInboxUri(),
      }),
      following: context.getFollowingUri(blogSlug),
      followers: context.getFollowersUri(blogSlug),
      url: new URL(`/@${blog.slug}`, context.canonicalOrigin),
    });

    await context.sendActivity(
      { identifier: blogSlug },
      "followers",
      new Update({
        id: new URL(
          `#update/${updateData.updated.toISOString()}`,
          context.getActorUri(blogSlug)
        ),
        actor: context.getActorUri(blogSlug),
        to: PUBLIC_COLLECTION,
        object: updatedPerson,
      }),
      {
        preferSharedInbox: true,
        excludeBaseUris: [new URL(context.origin)],
      }
    );

    console.log(
      `Successfully sent actor update to followers for blog: ${blogSlug}`
    );
  } catch (error) {
    console.error("Error in sendActorUpdateToFollowers:", error);
  }
}

export async function sendNoteToFollowers(
  blogSlug: string,
  postId: string,
  isDelete: boolean = false,
  isUpdate: boolean = false
) {
  try {
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

    const post = await db.query.postTable.findFirst({
      where: eq(postTable.id, postId),
    });

    if (!post) {
      console.log(`No post found with id: ${postId}`);
      return;
    }

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

async function handleMentionOrQuote(
  fedCtx: InboxContext<ContextData>,
  create: Create,
  object: Note | Article
) {
  const { db } = fedCtx.data;

  const actorObject = await create.getActor(fedCtx);
  if (!actorObject) return;

  const actor = await persistActor(fedCtx, actorObject, {
    ...fedCtx,
    outbox: false,
  });
  if (!actor) return;

  const content = object.content?.toString() || "";
  const objectId = object.id?.href;

  if (!objectId) return;

  if (object.quoteUrl) {
    const post = await db.query.postTable.findFirst({
      where: eq(postTable.id, object.quoteUrl.href.split("/").pop()!),
    });
    if (!post) return;

    await db.insert(notificationTable).values({
      type: "quote",
      actorId: actor.id,
      activityId: create.id?.href || objectId,
      objectId: object.id?.href,
      postId: post.id,
      content: object.content?.toString() || "",
      url: object.url?.toString(),
      created: new Date(),
      updated: new Date(),
    });

    return;
  }

  const replyTargetId = object.replyTargetId?.href;
  const replyTargetIdUuid = replyTargetId?.split("/").pop();
  if (!replyTargetIdUuid) return;

  let isReply = false;
  let replyTargetBlogId: string | null = null;
  let localPost;

  if (replyTargetId) {
    localPost = await db
      .select({
        post: postTable,
        blog: blogTable,
      })
      .from(postTable)
      .innerJoin(blogTable, eq(postTable.blogId, blogTable.id))
      .where(eq(postTable.id, replyTargetIdUuid))
      .limit(1);

    if (localPost.length > 0) {
      isReply = true;
      replyTargetBlogId = localPost[0].blog.id;
    }
  }

  if (!localPost) return;

  const mentions = [];
  for await (const tag of object.getTags({
    ...fedCtx,
    suppressError: true,
  })) {
    if (tag instanceof Mention && tag.href) {
      const tagHref =
        tag.href instanceof URL ? tag.href.href : String(tag.href);
      const localActor = await db
        .select({
          actor: actorTable,
          blog: blogTable,
        })
        .from(actorTable)
        .innerJoin(blogTable, eq(actorTable.blogId, blogTable.id))
        .where(eq(actorTable.iri, tagHref))
        .limit(1);

      if (localActor.length > 0) {
        mentions.push({
          blogId: localActor[0].blog.id,
          type: "mention" as const,
        });
      }
    }
  }
}

async function onFollowed(fedCtx: InboxContext<ContextData>, follow: Follow) {
  if (follow.id == null || follow.objectId == null) return;
  const followObject = fedCtx.parseUri(follow.objectId);
  if (followObject?.type !== "actor") return;
  const { db } = fedCtx.data;
  const followee = await db.query.blog.findFirst({
    with: { actor: true },
    where: (blog, { eq }) => eq(blog.slug, followObject.identifier),
  });
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
}

async function onPostShared(
  fedCtx: InboxContext<ContextData>,
  announce: Announce
): Promise<void> {
  const object = await announce.getObject({ ...fedCtx, suppressError: true });
  if (!isPostObject(object)) return;

  const post = await db.query.postTable.findFirst({
    where: eq(postTable.id, object.id?.href.split("/").pop()!),
  });
  if (!post) return;

  const actorObject = await announce.getActor(fedCtx);
  if (!actorObject) return;
  const actor = await persistActor(fedCtx, actorObject, {
    ...fedCtx,
    outbox: false,
  });
  if (!actor) return;

  const values = {
    id: crypto.randomUUID(),
    type: "announce" as const,
    actorId: actor.id,
    activityId: announce.id?.href!,
    objectId: object.id?.href!,
    postId: post.id,
    content: "",
    created: new Date(),
    updated: new Date(),
  };

  await db.insert(notificationTable).values(values);
}

async function onPostUnshared(
  fedCtx: InboxContext<ContextData>,
  undo: Undo
): Promise<void> {
  const announce = await undo.getObject({ ...fedCtx, suppressError: true });
  if (!(announce instanceof Announce)) return;
  if (
    !isPostObject(await announce.getObject({ ...fedCtx, suppressError: true }))
  )
    return;

  const post = await db.query.postTable.findFirst({
    where: eq(postTable.id, announce.objectId?.href.split("/").pop()!),
  });
  if (!post) return;

  const actorObject = await undo.getActor(fedCtx);
  if (actorObject == null) return;
  const actor = await persistActor(fedCtx, actorObject, {
    ...fedCtx,
    outbox: false,
  });
  if (actor == null) return;

  await db
    .delete(notificationTable)
    .where(
      and(
        eq(notificationTable.type, "announce"),
        eq(notificationTable.postId, post.id),
        eq(notificationTable.actorId, actor.id),
        eq(notificationTable.content, "")
      )
    );
}

async function onPostLiked(
  fedCtx: InboxContext<ContextData>,
  like: Like
): Promise<void> {
  const object = await like.getObject({ ...fedCtx, suppressError: true });
  if (!isPostObject(object)) return;
  const post = await db.query.postTable.findFirst({
    where: eq(postTable.id, object.id?.href.split("/").pop()!),
  });
  if (!post) return;
  const actor = await getActorByUri(like.actorId?.href!);
  if (!actor) return;

  await db.insert(notificationTable).values({
    type: "like",
    actorId: actor[0].id,
    activityId: like.id?.href!,
    objectId: object.id?.href!,
    postId: post.id,
    created: new Date(),
    updated: new Date(),
  });
}

async function onPostUnliked(
  fedCtx: InboxContext<ContextData>,
  undo: Undo
): Promise<void> {
  const object = await undo.getObject({ ...fedCtx, suppressError: true });
  if (!object) return;
  if (!(object instanceof Like)) return;
  const postObject = await object.getObject({ ...fedCtx, suppressError: true });
  if (!isPostObject(postObject)) return;
  const post = await db.query.postTable.findFirst({
    where: eq(postTable.id, postObject.id?.href.split("/").pop()!),
  });
  if (!post) return;
  const actor = await getActorByUri(undo.actorId?.href!);
  if (!actor) return;

  await db
    .delete(notificationTable)
    .where(
      and(
        eq(notificationTable.type, "like"),
        eq(notificationTable.postId, post.id),
        eq(notificationTable.actorId, actor[0].id)
      )
    );
}

async function onReactedOnPost(
  fedCtx: InboxContext<ContextData>,
  react: EmojiReact
): Promise<void> {
  const object = await react.getObject({ ...fedCtx, suppressError: true });
  if (!isPostObject(object)) return;
  const post = await db.query.postTable.findFirst({
    where: eq(postTable.id, object.id?.href.split("/").pop()!),
  });
  if (!post) return;
  const actor = await getActorByUri(react.actorId?.href!);
  if (!actor) return;

  await db.insert(notificationTable).values({
    type: "emoji_react",
    actorId: actor[0].id,
    activityId: react.id?.href!,
    objectId: object.id?.href!,
    postId: post.id,
    content: react.content?.toString(),
    created: new Date(),
    updated: new Date(),
  });
}

async function onReactionUndoneOnPost(
  fedCtx: InboxContext<ContextData>,
  undo: Undo
): Promise<void> {
  const reactionObject = await undo.getObject({
    ...fedCtx,
    suppressError: true,
  });
  if (!reactionObject) return;
  if (!(reactionObject instanceof EmojiReact)) return;
  const postObject = await reactionObject.getObject({
    ...fedCtx,
    suppressError: true,
  });
  if (!isPostObject(postObject)) return;
  const post = await db.query.postTable.findFirst({
    where: eq(postTable.id, postObject.id?.href.split("/").pop()!),
  });
  if (!post) return;
  const actor = await getActorByUri(undo.actorId?.href!);
  if (!actor) return;

  await db
    .delete(notificationTable)
    .where(
      and(
        eq(notificationTable.type, "emoji_react"),
        eq(notificationTable.postId, post.id),
        eq(notificationTable.actorId, actor[0].id),
        eq(notificationTable.content, reactionObject.content?.toString()!)
      )
    );
}

async function onCreate(
  fedCtx: InboxContext<ContextData>,
  create: Create
): Promise<void> {
  const object = await create.getObject({ ...fedCtx, suppressError: true });
  if (!object || (!(object instanceof Note) && !(object instanceof Article)))
    return;
  await handleMentionOrQuote(fedCtx, create, object);
}

async function onPostDeleted(
  fedCtx: InboxContext<ContextData>,
  deleteActivity: Delete
): Promise<void> {
  const object = await deleteActivity.getObject({
    ...fedCtx,
    suppressError: true,
  });
  if (!object) return;

  await db
    .delete(notificationTable)
    .where(eq(notificationTable.objectId, object.id?.href!));
}

export const activityHandlers = {
  onUnfollowed,
  onFollowed,
  onPostShared,
  onPostUnshared,
  onPostLiked,
  onPostUnliked,
  onReactedOnPost,
  onReactionUndoneOnPost,
  onCreate,
  onPostDeleted,
};
