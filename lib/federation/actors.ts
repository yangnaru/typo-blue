import {
  Context,
  DocumentLoader,
  Link,
  isActor,
  Actor,
  Hashtag,
  Emoji,
  getActorTypeName,
  getActorHandle,
} from "@fedify/fedify";
import {
  blog as blogTable,
  instanceTable,
  actorTable,
  followingTable,
} from "@/drizzle/schema";
import { eq, sql } from "drizzle-orm";
import type { Database, ContextData } from "./core";
import { toDate, getNodeInfo, formatSemVer } from "./utils";

export type Instance = typeof instanceTable.$inferSelect;
export type NewInstance = typeof instanceTable.$inferInsert;

type PersistInstanceOptions = {
  skipUpdate?: boolean;
};

export async function getPersistedActor(
  db: Database,
  iri: string | URL
): Promise<
  | (typeof actorTable.$inferSelect & {
      blog: typeof blogTable.$inferSelect | null;
    })
  | undefined
> {
  return await db.query.actorTable.findFirst({
    with: { blog: true },
    where: eq(actorTable.iri, iri.toString()),
  });
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
) {
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
    blogId: null,
    sensitive: false,
    postsCount: 0,
    publicKeyPem: null,
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
  const result = await db
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
    })
    .returning();
  return result[0];
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
