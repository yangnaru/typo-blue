"use server";

import { getCurrentSession } from "@/lib/auth";
import { getOrCreateActorForBlog, getActorForBlog } from "@/lib/activitypub";
import { db } from "@/lib/db";
import { blog as blogTable } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

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

export async function getActivityPubProfileForBlog(blogSlug: string) {
  const { user } = await getCurrentSession();

  if (!user) {
    return null;
  }

  try {
    // Get the user's blog
    const blog = await db
      .select()
      .from(blogTable)
      .where(eq(blogTable.slug, blogSlug))
      .limit(1);

    if (blog.length === 0 || blog[0].userId !== user.id) {
      return null;
    }

    // Check if actor exists (without creating one)
    const actor = await getActorForBlog(blog[0].id);

    if (!actor) {
      return null; // No actor exists yet
    }

    return {
      handle: actor.handle,
      uri: actor.iri,
      name: actor.name,
      summary: actor.bioHtml,
    };
  } catch (error) {
    console.error("Failed to get ActivityPub profile:", error);
    return null;
  }
}

export async function publishActivityPubPost(postId: string, blogSlug: string) {
  const { user } = await getCurrentSession();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    // Get blog details
    const blog = await db
      .select()
      .from(blogTable)
      .where(eq(blogTable.slug, blogSlug))
      .limit(1);

    if (blog.length === 0 || blog[0].userId !== user.id) {
      return { success: false, error: "Blog not found or unauthorized" };
    }

    const domain = process.env.NEXT_PUBLIC_DOMAIN!;
    const actor = await getOrCreateActorForBlog(blog[0].id, domain);

    // Get post details
    const postQuery = await db.query.post.findFirst({
      where: (post, { eq }) => eq(post.id, postId),
      with: {
        blog: true,
      },
    });

    if (!postQuery || !postQuery.published) {
      return { success: false, error: "Post not found or not published" };
    }

    if (postQuery.blog.id !== blog[0].id) {
      return { success: false, error: "Post does not belong to this blog" };
    }

    // Create ActivityPub Note/Article
    const postUrl = `https://${domain}/@${blogSlug}/${postId}`;
    const activityId = `${actor.iri}/posts/${postId}`;

    // This would normally be handled by the federation system
    // For now, we'll just log that a post would be published
    console.log(`Would publish ActivityPub post: ${activityId}`);
    console.log(`Post URL: ${postUrl}`);
    console.log(`Title: ${postQuery.title}`);

    return { success: true };
  } catch (error) {
    console.error("Failed to publish ActivityPub post:", error);
    return { success: false, error: "Failed to publish to ActivityPub" };
  }
}
