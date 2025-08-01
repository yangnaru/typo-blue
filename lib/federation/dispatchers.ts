import { Person, Create, Note, Endpoints, importJwk } from "@fedify/fedify";
import { db } from "../db";
import {
  blog as blogTable,
  actorTable,
  followingTable,
  postTable,
} from "@/drizzle/schema";
import { eq, and, sql } from "drizzle-orm";
import { getNote } from "./utils";
import { federation, routePrefix } from "./core";

export function setupActorDispatcher() {
  federation
    .setActorDispatcher(
      `${routePrefix}/users/{identifier}`,
      async (ctx, identifier) => {
        const actor = await db.query.actorTable.findFirst({
          where: eq(actorTable.id, identifier),
          with: { blog: true },
        });
        if (!actor) return null;
        if (!actor.blog) return null;

        return new Person({
          id: ctx.getActorUri(identifier),
          preferredUsername: actor.blog.slug,
          name: actor.blog.name,
          summary: actor.blog.description,
          manuallyApprovesFollowers: false,
          publicKey: (await ctx.getActorKeyPairs(actor.id))[0].cryptographicKey,
          inbox: ctx.getInboxUri(identifier),
          outbox: ctx.getOutboxUri(identifier),
          endpoints: new Endpoints({
            sharedInbox: ctx.getInboxUri(),
          }),
          following: ctx.getFollowingUri(identifier),
          followers: ctx.getFollowersUri(identifier),
          url: new URL(`/@${actor.blog.slug}`, ctx.canonicalOrigin),
        });
      }
    )
    .setKeyPairsDispatcher(async (ctx, identifier) => {
      const { db } = ctx.data;

      const actor = await db.query.actorTable.findFirst({
        where: eq(actorTable.id, identifier),
        with: { blog: true },
      });
      if (!actor) return [];
      if (!actor.blog) return [];

      try {
        const { publicKeyPem, privateKeyPem } = actor;
        if (!publicKeyPem || !privateKeyPem) return [];

        const privateKey = await importJwk(
          JSON.parse(privateKeyPem),
          "private"
        );
        const publicKey = await importJwk(JSON.parse(publicKeyPem), "public");

        return [
          {
            privateKey,
            publicKey,
          },
        ];
      } catch (error) {
        console.error(
          "Failed to import key pairs for actor:",
          identifier,
          error
        );
        return [];
      }
    });
}

export function setupOutboxDispatcher() {
  federation.setOutboxDispatcher(
    `${routePrefix}/users/{identifier}/outbox`,
    async (ctx, identifier, cursor) => {
      const blogResult = await db
        .select({ blogId: blogTable.id })
        .from(blogTable)
        .where(eq(blogTable.slug, identifier))
        .limit(1);

      if (blogResult.length === 0) return { items: [] };

      const posts = await db.query.postTable.findMany({
        where: (post, { eq, and, isNotNull }) =>
          and(
            eq(post.blogId, blogResult[0].blogId),
            isNotNull(post.published),
            isNotNull(post.content)
          ),
        orderBy: (post, { desc }) => desc(post.published),
        limit: 20,
      });

      const articles = await Promise.all(
        posts.map((post) => getNote(ctx, post, identifier))
      );
      if (articles.length === 0) return { items: [] };

      const createArticles = articles.map((article) => {
        if (!article) return null;
        return new Create({
          id: new URL("#create", article.id ?? ctx.origin),
          actors: [ctx.getActorUri(identifier)],
          object: article,
        });
      });
      return { items: createArticles.filter((article) => article != null) };
    }
  );
}

export function setupFollowersDispatcher() {
  federation.setFollowersDispatcher(
    `${routePrefix}/users/{identifier}/followers`,
    async (ctx, identifier, cursor) => {
      const localActor = await db
        .select({ id: actorTable.id })
        .from(blogTable)
        .innerJoin(actorTable, eq(actorTable.blogId, blogTable.id))
        .where(eq(blogTable.slug, identifier))
        .limit(1);

      if (localActor.length === 0) return { items: [] };

      const followers = await db
        .select({
          followerActor: actorTable,
        })
        .from(followingTable)
        .innerJoin(actorTable, eq(followingTable.followerId, actorTable.id))
        .where(
          and(
            eq(followingTable.followeeId, localActor[0].id),
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
}

export function setupFollowingDispatcher() {
  federation.setFollowingDispatcher(
    `${routePrefix}/users/{identifier}/following`,
    async (ctx, identifier, cursor) => {
      return { items: [] };
    }
  );
}

export function setupObjectDispatcher() {
  federation.setObjectDispatcher(
    Note,
    `${routePrefix}/notes/{id}`,
    async (ctx, values) => {
      const post = await ctx.data.db.query.postTable.findFirst({
        where: eq(postTable.id, values.id),
      });
      if (post == null) return null;
      return await getNote(ctx, post, post.blogId);
    }
  );
}

export function setupAllDispatchers() {
  setupActorDispatcher();
  setupOutboxDispatcher();
  setupFollowersDispatcher();
  setupFollowingDispatcher();
  setupObjectDispatcher();
}
