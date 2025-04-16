"use server";

import { getCurrentSession } from "../auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { decodePostId, encodePostId } from "../utils";
import { db } from "../db";
import { blog, follow, post, user } from "../schema";
import { and, eq } from "drizzle-orm";

export async function createBlog(blogId: string) {
  const { user } = await getCurrentSession();

  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  const blogs = await db.query.blog.findMany({
    where: eq(blog.userId, user.id),
  });

  if (blogs.length >= 3) {
    return { error: "블로그는 최대 3개까지 만들 수 있습니다." };
  }

  const regex = /^[0-9a-zA-Z(\_)]+$/;
  if (!(0 < blogId.length && blogId.length < 20) || !regex.test(blogId)) {
    return {
      error:
        "블로그 ID는 1자 이상 20자 이하의 영문, 숫자, 밑줄만 사용할 수 있습니다.",
    };
  }

  const existingBlog = await db.query.blog.findFirst({
    where: eq(blog.slug, blogId.toLowerCase()),
  });

  if (existingBlog) {
    return { error: "이미 존재하는 블로그 ID입니다." };
  }

  try {
    const [q] = await db
      .insert(blog)
      .values({
        slug: blogId.toLowerCase(),
        userId: user.id,
        updatedAt: new Date().toISOString(),
      })
      .returning();

    return { blogId: q.slug };
  } catch (e) {
    return { error: "알 수 없는 오류가 발생했습니다." };
  }
}

export async function deleteBlog(blogId: string) {
  const { user } = await getCurrentSession();

  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  const targetBlog = await db.query.blog.findFirst({
    where: eq(blog.slug, blogId),
    with: {
      user: true,
    },
  });

  if (!targetBlog) {
    return { error: "블로그를 찾을 수 없습니다." };
  }

  if (targetBlog.user.email !== user.email) {
    return { error: "권한이 없습니다." };
  }

  await db.delete(blog).where(eq(blog.slug, blogId));

  return {
    success: true,
  };
}

export async function followBlog(formData: FormData) {
  const blogId = formData.get("blogId") as string;

  const { user: sessionUser } = await getCurrentSession();

  if (!sessionUser) {
    return { error: "로그인이 필요합니다." };
  }

  const currentUser = await db.query.user.findFirst({
    where: eq(user.id, sessionUser.id),
    with: {
      blogs: true,
    },
  });

  if (!currentUser) {
    return { error: "로그인이 필요합니다." };
  }

  if (!currentUser.blogs || currentUser.blogs.length === 0) {
    return { error: "블로그를 만들어야 팔로우할 수 있습니다." };
  }

  const targetBlog = await db.query.blog.findFirst({
    where: eq(blog.slug, blogId),
  });

  if (!targetBlog) {
    return { error: "블로그를 찾을 수 없습니다." };
  }

  if (sessionUser.id === targetBlog.userId) {
    return { error: "자신의 블로그를 팔로우할 수 없습니다." };
  }

  try {
    await db.insert(follow).values({
      followerId: currentUser.blogs[0].id,
      followingId: targetBlog.id,
      updatedAt: new Date(),
    });
  } catch {}

  revalidatePath(`/@${blogId}`);
  redirect(`/@${blogId}`);
}

export async function unfollowBlog(formData: FormData) {
  const blogId = formData.get("blogId") as string;

  const { user: sessionUser } = await getCurrentSession();

  if (!sessionUser) {
    return { error: "로그인이 필요합니다." };
  }

  const currentUser = await db.query.user.findFirst({
    where: eq(user.id, sessionUser.id),
    with: {
      blogs: true,
    },
  });

  if (!currentUser) {
    return { error: "로그인이 필요합니다." };
  }

  if (!currentUser.blogs || currentUser.blogs.length === 0) {
    return { error: "블로그를 만들어야 팔로우할 수 있습니다." };
  }

  const targetBlog = await db.query.blog.findFirst({
    where: eq(blog.slug, blogId),
  });

  if (!targetBlog) {
    return { error: "블로그를 찾을 수 없습니다." };
  }

  if (sessionUser.id === targetBlog.userId) {
    return { error: "자신의 블로그를 팔로우할 수 없습니다." };
  }

  try {
    await db
      .delete(follow)
      .where(
        and(
          eq(follow.followerId, currentUser.blogs[0].id),
          eq(follow.followingId, targetBlog.id)
        )
      );
  } catch {}

  revalidatePath(`/@${blogId}`);
  redirect(`/@${blogId}`);
}

async function assertCurrentUserHasBlogWithIdAndPostWithId(
  blogId: string,
  postId: string
) {
  const { user } = await getCurrentSession();
  if (!user) {
    throw new Error("사용자가 없습니다.");
  }

  const targetPost = await db.query.post.findFirst({
    where: and(
      eq(post.uuid, postId),
      eq(post.blogId, blog.id),
      eq(blog.slug, blogId),
      eq(blog.userId, user.id)
    ),
  });

  if (!targetPost) {
    throw new Error("글을 찾을 수 없습니다.");
  }

  return targetPost;
}

export async function publishPost(blogId: string, postId: string) {
  const uuid = decodePostId(postId);
  await assertCurrentUserHasBlogWithIdAndPostWithId(blogId, uuid);

  await db
    .update(post)
    .set({
      publishedAt: new Date(),
    })
    .where(eq(post.uuid, uuid));

  return {
    success: true,
  };
}

export async function unPublishPost(blogId: string, postId: string) {
  const uuid = decodePostId(postId);
  await assertCurrentUserHasBlogWithIdAndPostWithId(blogId, uuid);

  await db
    .update(post)
    .set({
      publishedAt: null,
    })
    .where(eq(post.uuid, uuid));

  return {
    success: true,
  };
}

export async function deletePost(blogId: string, postId: string) {
  const uuid = decodePostId(postId);
  await assertCurrentUserHasBlogWithIdAndPostWithId(blogId, uuid);

  await db
    .update(post)
    .set({
      title: null,
      content: null,
      deletedAt: new Date(),
    })
    .where(eq(post.uuid, uuid));

  return {
    success: true,
  };
}

export async function upsertPost(
  blogSlug: string,
  publishedAt: Date | null,
  postId: string | null,
  title: string,
  content: string
) {
  const { user } = await getCurrentSession();
  if (!user) {
    throw new Error("사용자가 없습니다.");
  }

  const targetBlog = await db.query.blog.findFirst({
    where: and(eq(blog.slug, blogSlug), eq(blog.userId, user.id)),
  });

  if (!targetBlog) {
    throw new Error("블로그를 찾을 수 없습니다.");
  }

  const uuid = postId ? decodePostId(postId) : undefined;

  let targetPost;
  if (uuid) {
    const [updatedPost] = await db
      .update(post)
      .set({
        title,
        content,
        publishedAt,
      })
      .where(eq(post.uuid, uuid))
      .returning();
    targetPost = updatedPost;
  } else {
    const [newPost] = await db
      .insert(post)
      .values({
        title,
        content,
        publishedAt,
        blogId: targetBlog.id,
        updatedAt: new Date(),
        uuid: crypto.randomUUID(),
      })
      .returning();
    targetPost = newPost;
  }

  revalidatePath(`/@${blogSlug}`);

  return {
    success: true,
    postId: encodePostId(targetPost.uuid),
  };
}

export async function editBlogInfo(
  blogSlug: string,
  name: string,
  description: string,
  discoverable: boolean
) {
  const { user } = await getCurrentSession();
  if (!user) {
    throw new Error("사용자가 없습니다.");
  }

  const targetBlog = await db.query.blog.findFirst({
    where: and(eq(blog.slug, blogSlug), eq(blog.userId, user.id)),
  });

  if (!targetBlog) {
    throw new Error("블로그를 찾을 수 없습니다.");
  }

  await db
    .update(blog)
    .set({
      name,
      description,
      discoverable,
    })
    .where(eq(blog.id, targetBlog.id));

  return {
    success: true,
  };
}
