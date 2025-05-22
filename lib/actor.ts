import {
    type Context,
    type DocumentLoader,
    getActorHandle,
    getActorTypeName,
    isActor,
    Link,
    PropertyValue,
    traverseCollection,
  } from "@fedify/fedify";
  import * as vocab from "@fedify/fedify/vocab";
  import { getLogger } from "@logtape/logtape";
  import {
    aliasedTable,
    and,
    count,
    desc,
    eq,
    inArray,
    isNull,
    ne,
    notInArray,
    or,
    sql,
  } from "drizzle-orm";
  import type Keyv from "keyv";
  import type { Database, RelationsFilter } from "../db.ts";
  import metadata from "../deno.json" with { type: "json" };
  import {
    getAvatarUrl as getAccountAvatarUrl,
    renderAccountLinks,
  } from "./account.ts";
  import { toDate } from "./date.ts";
  import { persistInstance } from "./instance.ts";
  import { renderMarkup } from "./markup.ts";
  import { isPostObject, persistPost, persistSharedPost } from "./post.ts";
  import {
    type Account,
    type AccountEmail,
    type AccountLink,
    type Actor,
    actorTable,
    followingTable,
    type Instance,
    instanceTable,
    type NewActor,
    type NewInstance,
    postTable,
  } from "./schema.ts";
  import { generateUuidV7, type Uuid } from "./uuid.ts";
  export { getAvatarUrl } from "./avatar.ts";
  
  const logger = getLogger(["hackerspub", "models", "actor"]);
  
  export async function syncActorFromAccount(
    db: Database,
    kv: Keyv,
    disk: Disk,
    fedCtx: Context<void>,
    account: Account & { emails: AccountEmail[]; links: AccountLink[] },
  ): Promise<
    Actor & {
      account: Account & { emails: AccountEmail[]; links: AccountLink[] };
      instance: Instance;
    }
  > {
    const instance: NewInstance = {
      host: fedCtx.host,
      software: "hackerspub",
      softwareVersion: metadata.version,
    };
    const instances = await db.insert(instanceTable)
      .values(instance)
      .onConflictDoUpdate({
        target: instanceTable.host,
        set: {
          ...instance,
          updated: sql`CURRENT_TIMESTAMP`,
        },
      })
      .returning();
    const values: Omit<NewActor, "id"> = {
      iri: fedCtx.getActorUri(account.id).href,
      type: "Person",
      username: account.username,
      instanceHost: instance.host,
      handleHost: instance.host,
      accountId: account.id,
      name: account.name,
      bioHtml: (await renderMarkup(db, disk, fedCtx, account.bio, {
        docId: account.id,
        kv,
      })).html,
      automaticallyApprovesFollowers: true,
      inboxUrl: fedCtx.getInboxUri(account.id).href,
      sharedInboxUrl: fedCtx.getInboxUri().href,
      avatarUrl: await getAccountAvatarUrl(account),
      fieldHtmls: Object.fromEntries(
        renderAccountLinks(account.links).map((
          pair,
        ) => [pair.name, pair.value]),
      ),
      url: new URL(`/@${account.username}`, fedCtx.origin).href,
      updated: account.updated,
      created: account.created,
      published: account.created,
    };
    const rows = await db.insert(actorTable)
      .values({ id: generateUuidV7(), ...values })
      .onConflictDoUpdate({
        target: actorTable.accountId,
        set: values,
        setWhere: eq(actorTable.accountId, account.id),
      })
      .returning();
    return { ...rows[0], account, instance: instances[0] };
  }
  
  export async function persistActor(
    db: Database,
    ctx: Context<void>,
    actor: vocab.Actor,
    options: {
      contextLoader?: DocumentLoader;
      documentLoader?: DocumentLoader;
      outbox?: boolean;
    } = {},
  ): Promise<
    Actor & {
      instance: Instance;
      account: Account | null;
      successor: Actor | null;
    } | undefined
  > {
    if (actor.id == null) return undefined;
    else if (actor.inboxId == null) {
      logger.warn("Actor {actorId} has no inbox.", { actorId: actor.id.href });
      return undefined;
    }
    const instance = await persistInstance(db, actor.id.host);
    let handle: string;
    try {
      handle = await getActorHandle(actor, { trimLeadingAt: true });
    } catch (error) {
      logger.warn(
        "Failed to get handle for actor {actorId}: {error}",
        { actorId: actor.id.href, error },
      );
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
      ],
    );
    const tags: Record<string, string> = {};
    const emojis: Record<string, string> = {};
    for await (const tag of actor.getTags(getterOpts)) {
      if (tag instanceof vocab.Hashtag) {
        if (tag.name == null || tag.href == null) continue;
        tags[tag.name.toString().toLowerCase()] = tag.href.href;
      } else if (tag instanceof vocab.Emoji) {
        if (tag.name == null) continue;
        const icon = await tag.getIcon(getterOpts);
        if (
          icon?.url == null ||
          icon.url instanceof vocab.Link && icon.url.href == null
        ) {
          continue;
        }
        emojis[tag.name.toString()] = icon.url instanceof URL
          ? icon.url.href
          : icon.url.href!.href;
      }
    }
    const successor = await actor.getSuccessor(getterOpts);
    const successorActor = isActor(successor)
      ? await persistActor(db, ctx, successor, options)
      : null;
    const values: Omit<NewActor, "id"> = {
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
      avatarUrl: avatar?.url instanceof Link
        ? avatar.url.href?.href
        : avatar?.url?.href,
      headerUrl: header?.url instanceof Link
        ? header.url.href?.href
        : header?.url?.href,
      fieldHtmls: Object.fromEntries(
        attachments.filter((a) => a instanceof PropertyValue).map(
          (p) => [p.name, p.value],
        ),
      ),
      emojis,
      tags,
      url: actor.url instanceof Link ? actor.url.href?.href : actor.url?.href,
      followeesCount: followees?.totalItems ?? 0,
      followersCount: followers?.totalItems ?? 0,
      aliases: actor.aliasIds?.map((a) => a.href),
      successorId:
        successorActor == null || !successorActor.aliases.includes(actor.id.href)
          ? null
          : successorActor.id,
      updated: toDate(actor.updated) ?? undefined,
      published: toDate(actor.published),
    };
    const rows = await db.insert(actorTable)
      .values({ ...values, id: generateUuidV7() })
      .onConflictDoUpdate({
        target: actorTable.iri,
        set: values,
        setWhere: eq(actorTable.iri, actor.id.href),
      })
      .returning();
    const result = { ...rows[0], instance };
    const featured = await actor.getFeatured(getterOpts);
    if (featured != null) {
      for await (const object of traverseCollection(featured, getterOpts)) {
        if (!isPostObject(object)) continue;
        await persistPost(db, ctx, object, {
          ...options,
          actor: result,
          replies: true,
        });
      }
    }
    const outbox = options.outbox ? await actor.getOutbox(getterOpts) : null;
    if (outbox != null) {
      let i = 0;
      for await (
        const activity of traverseCollection(outbox, getterOpts)
      ) {
        if (activity instanceof vocab.Create) {
          let object: vocab.Object | null;
          try {
            object = await activity.getObject(getterOpts);
          } catch (error) {
            logger.warn(
              "Failed to get object for activity {activityId}: {error}",
              { activityId: activity.id?.href, error },
            );
            continue;
          }
          if (!isPostObject(object)) continue;
          const persisted = await persistPost(db, ctx, object, {
            ...options,
            actor: result,
            replies: true,
          });
          if (persisted != null) i++;
        } else if (activity instanceof vocab.Announce) {
          const persisted = await persistSharedPost(db, ctx, activity, {
            ...options,
            actor: result,
          });
          if (persisted != null) i++;
        }
        if (i >= 10) break;
      }
    }
    return { ...result, account: null, successor: successorActor ?? null };
  }
  
  export function getPersistedActor(
    db: Database,
    iri: string | URL,
  ): Promise<
    Actor & { instance: Instance; account: Account | null } | undefined
  > {
    return db.query.actorTable.findFirst({
      with: { instance: true, account: true },
      where: { iri: iri.toString() },
    });
  }