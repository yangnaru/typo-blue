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
