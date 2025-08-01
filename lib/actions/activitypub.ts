"use server";

import { getCurrentSession } from "@/lib/auth";
import { getOrCreateActorForBlog, getActorForBlog } from "@/lib/activitypub";
import { db } from "@/lib/db";
import {
  blog as blogTable,
  actorTable,
  postTable,
  followingTable,
} from "@/drizzle/schema";
import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import { federation } from "@/lib/federation";
import { Delete } from "@fedify/fedify";

export async function setupActivityPubActorForBlog(blogSlug: string) {
  const { user } = await getCurrentSession();

  if (!user) {
    redirect("/auth/signin");
  }

  try {
    // Get the user's blog
    const blog = await db
      .select()
      .from(blogTable)
      .where(eq(blogTable.slug, blogSlug))
      .limit(1);

    if (blog.length === 0 || blog[0].userId !== user.id) {
      return {
        success: false,
        error: "Blog not found or unauthorized",
      };
    }

    const domain = process.env.NEXT_PUBLIC_DOMAIN!;
    const actor = await getOrCreateActorForBlog(blog[0].id, domain);

    return {
      success: true,
      actor: {
        handle: actor.handle,
        uri: actor.iri,
      },
    };
  } catch (error) {
    console.error("Failed to setup ActivityPub actor:", error);
    return {
      success: false,
      error: "Failed to setup ActivityPub profile",
    };
  }
}

export async function disableFederationForBlog(blogSlug: string) {
  const { user } = await getCurrentSession();

  if (!user) {
    redirect("/auth/signin");
  }

  try {
    // Get the user's blog
    const blog = await db
      .select()
      .from(blogTable)
      .where(eq(blogTable.slug, blogSlug))
      .limit(1);

    if (blog.length === 0 || blog[0].userId !== user.id) {
      return {
        success: false,
        error: "Blog not found or unauthorized",
      };
    }

    const blogData = blog[0];

    // Get the actor for this blog
    const actor = await getActorForBlog(blogData.id);
    if (!actor) {
      return {
        success: false,
        error: "No ActivityPub profile found for this blog",
      };
    }

    // Send Delete activities for all published posts
    const publishedPosts = await db
      .select()
      .from(postTable)
      .where(
        and(
          eq(postTable.blogId, blogData.id)
          // Only posts that are published
          // Add any additional conditions for what constitutes a "published" post in the fediverse
        )
      );

    // Send Delete activity for the actor itself
    try {
      const baseUrl = new URL(`https://${process.env.NEXT_PUBLIC_DOMAIN!}`);
      const context = federation.createContext(baseUrl, {
        db,
        canonicalOrigin: baseUrl.origin,
      });

      // Create the Person object for the actor being deleted
      const personToDelete = await getActorForBlog(blogData.id);

      // Send Delete activity to followers
      await context.sendActivity(
        { identifier: blogSlug },
        "followers",
        new Delete({
          id: new URL(
            `#delete-actor/${new Date().toISOString()}`,
            context.getActorUri(blogSlug)
          ),
          actor: context.getActorUri(blogSlug),
          object: new URL(personToDelete!.iri!),
        }),
        {
          preferSharedInbox: true,
          excludeBaseUris: [new URL(context.origin)],
        }
      );

      console.log(
        `Successfully sent actor delete activity for blog: ${blogSlug}`
      );
    } catch (error) {
      console.error(
        `Failed to send delete activity for actor ${blogSlug}:`,
        error
      );
      // Continue with cleanup even if this fails
    }

    // Remove all follows/followers relationships
    await db
      .delete(followingTable)
      .where(and(eq(followingTable.followeeId, actor.id)));

    await db
      .delete(followingTable)
      .where(and(eq(followingTable.followerId, actor.id)));

    // Delete the actor itself
    await db.delete(actorTable).where(eq(actorTable.id, actor.id));

    return {
      success: true,
      message: "연합우주 기능이 성공적으로 비활성화되었습니다.",
    };
  } catch (error) {
    console.error("Failed to disable federation:", error);
    return {
      success: false,
      error: "Failed to disable federation",
    };
  }
}
