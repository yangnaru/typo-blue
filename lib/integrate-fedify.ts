import { getXForwardedRequest } from "x-forwarded-fetch";
import {
  Accept,
  createFederation,
  Endpoints,
  Follow,
  generateCryptoKeyPair,
  MemoryKvStore,
  Person,
  Undo,
  exportJwk,
  importJwk,
} from "@fedify/fedify";
import { revalidatePath } from "next/cache";
import { db } from "./db";
import { blog, follow as followTable } from "@/drizzle/schema";
import { and, eq } from "drizzle-orm";

export const fedifyRequestHanlder = integrateFederation(() => {});

const routePrefix = `/ap`;

const federation = createFederation<void>({
  kv: new MemoryKvStore(),
});

federation
  .setActorDispatcher(
    `${routePrefix}/users/{identifier}`,
    async (context, identifier) => {
      const targetBlog = await db.query.blog.findFirst({
        where: (blog, { eq }) => eq(blog.slug, identifier),
      });
      if (!targetBlog) {
        return null;
      }

      const keyPairs = await context.getActorKeyPairs(identifier);
      return new Person({
        id: context.getActorUri(identifier),
        name: targetBlog.name ?? identifier,
        summary: targetBlog.description,
        preferredUsername: identifier,
        url: new URL("/", context.url),
        inbox: context.getInboxUri(identifier),
        endpoints: new Endpoints({
          sharedInbox: context.getInboxUri(),
        }),
        publicKey: keyPairs[0].cryptographicKey,
        assertionMethods: keyPairs.map((keyPair) => keyPair.multikey),
      });
    }
  )
  .setKeyPairsDispatcher(async (_, identifier) => {
    const targetBlog = await db.query.blog.findFirst({
      where: (blog, { eq }) => eq(blog.slug, identifier),
    });
    if (!targetBlog) {
      return [];
    }

    if (targetBlog.privateKey == null || targetBlog.publicKey == null) {
      return [];
    }

    try {
      const privateKey = await importJwk(targetBlog.privateKey, "private");
      const publicKey = await importJwk(targetBlog.publicKey, "public");

      return [
        {
          privateKey,
          publicKey,
        },
      ];
    } catch (e) {
      const { privateKey, publicKey } = await generateCryptoKeyPair();
      await db
        .update(blog)
        .set({
          privateKey: await exportJwk(privateKey),
          publicKey: await exportJwk(publicKey),
        })
        .where(eq(blog.slug, identifier))
        .execute();
      return [{ privateKey, publicKey }];
    }
  });

federation
  .setInboxListeners(`${routePrefix}/users/{identifier}/inbox`, "/inbox")
  .on(Follow, async (context, follow) => {
    console.log("follow", follow, context);
    if (
      follow.id == null ||
      follow.actorId == null ||
      follow.objectId == null
    ) {
      return;
    }
    const result = context.parseUri(follow.objectId);
    if (result?.type !== "actor") {
      return;
    }

    const targetBlog = await db.query.blog.findFirst({
      where: (blog, { eq }) => eq(blog.slug, result.identifier),
    });
    if (!targetBlog) {
      return;
    }
    console.log({ targetBlog });

    const follower = await follow.getActor(context);
    if (follower?.id == null) {
      throw new Error("follower is null");
    }
    await context.sendActivity(
      { identifier: result.identifier },
      follower,
      new Accept({
        id: new URL(
          `#accepts/${follower.id.href}`,
          context.getActorUri(targetBlog.slug)
        ),
        actor: follow.objectId,
        object: follow,
      })
    );

    await db.insert(followTable).values({
      followingId: targetBlog.id,
      iri: follow.id.href,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    revalidatePath("/");
  })
  .on(Undo, async (context, undo) => {
    const activity = await undo.getObject(context);
    if (activity instanceof Follow) {
      if (activity.id == null) {
        return;
      }
      if (undo.actorId == null) {
        return;
      }

      console.log("undo", activity, undo);
      const result = context.parseUri(activity.objectId);
      console.log({ result });

      // await db
      //   .delete(followTable)
      //   .where(
      //     and(
      //       eq(followTable.iri, undo.actorId.href),
      //       eq(followTable.followerId, )
      //     )
      //   );

      revalidatePath("/");
    } else {
      console.debug(undo);
    }
  });

function integrateFederation(
  contextDataFactory: (request: Request) => void | Promise<void>
) {
  return async (request: Request) => {
    const forwardedRequest = await getXForwardedRequest(request);
    const contextData = await contextDataFactory(forwardedRequest);
    return await federation.fetch(forwardedRequest, {
      contextData,
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
