"use server";

import { prisma } from "../db";
import { validateRequest } from "../auth";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import sanitize from "sanitize-html";
import { decodePostId, encodePostId } from "../utils";

export async function createBlog(blogId: string) {
  const { user } = await validateRequest();

  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  const blogs = await prisma.blog.findMany({
    where: {
      user: {
        email: user.email,
      },
    },
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

  const existingBlog = await prisma.blog.findFirst({
    where: {
      slug: {
        equals: blogId,
        mode: "insensitive",
      },
    },
  });

  if (existingBlog) {
    return { error: "이미 존재하는 블로그 ID입니다." };
  }

  try {
    const q = await prisma.blog.create({
      data: {
        slug: blogId,
        user: {
          connect: {
            email: user.email,
          },
        },
      },
    });

    return { blogId: q.slug };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002") {
        if (e.message.includes("userId")) {
          return { error: "이미 블로그를 만들었습니다." };
        } else {
          return { error: "이미 존재하는 블로그 ID입니다." };
        }
      }
    }
    return { error: "알 수 없는 오류가 발생했습니다." };
  }
}

export async function deleteBlog(blogId: string) {
  const { user } = await validateRequest();

  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  const blog = await prisma.blog.findUnique({
    where: {
      slug: blogId,
    },
    include: {
      user: true,
    },
  });

  if (!blog) {
    return { error: "블로그를 찾을 수 없습니다." };
  }

  if (blog.user.email !== user.email) {
    return { error: "권한이 없습니다." };
  }

  await prisma.blog.delete({
    where: {
      slug: blogId,
    },
  });

  return {
    success: true,
  };
}

export async function writeToGuestbook(formData: FormData) {
  const blogId = formData.get("blogId") as string;
  const content = formData.get("content") as string;

  const { user } = await validateRequest();

  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  const blog = await prisma.blog.findUnique({
    where: {
      slug: blogId,
    },
  });

  if (!blog) {
    return { error: "블로그를 찾을 수 없습니다." };
  }

  if (user.id === blog.userId) {
    return { error: "자신의 블로그에는 방명록을 남길 수 없습니다." };
  }

  const guestbook = await prisma.guestbook.create({
    data: {
      content: sanitize(content),
      blog: {
        connect: {
          slug: blogId,
        },
      },
      author: {
        connect: {
          email: user.email,
        },
      },
    },
  });

  revalidatePath(`/@${blogId}/guestbook`);

  redirect(`/@${blogId}/guestbook/${encodePostId(guestbook.uuid)}`);
}

export async function saveGuestbookReply(formData: FormData) {
  const content = formData.get("content") as string;
  const guestbookId = formData.get("guestbookId") as string;

  const { user } = await validateRequest();

  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  const guestbook = await prisma.guestbook.findUnique({
    where: {
      uuid: guestbookId,
    },
    include: {
      blog: true,
    },
  });

  if (!guestbook) {
    return { error: "방명록 게시글을 찾을 수 없습니다." };
  }

  if (user.id !== guestbook.blog.userId) {
    return { error: "권한이 없습니다." };
  }

  await prisma.guestbook.update({
    where: {
      uuid: guestbookId,
    },
    data: {
      reply: sanitize(content),
      repliedAt: new Date(),
    },
  });

  revalidatePath(`/@${guestbook.blog.slug}/guestbook`);

  redirect(`/@${guestbook.blog.slug}/guestbook/${encodePostId(guestbookId)}`);
}

export async function deleteGuestbook(uuid: string) {
  const { user } = await validateRequest();

  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  const guestbook = await prisma.guestbook.findUnique({
    where: {
      uuid,
    },
    include: {
      blog: true,
    },
  });

  if (!guestbook) {
    return { error: "방명록 게시글을 찾을 수 없습니다." };
  }

  if (!(user.id === guestbook.blog.userId || user.id === guestbook.authorId)) {
    return { error: "권한이 없습니다." };
  }

  if (user.id === guestbook.authorId && guestbook.repliedAt) {
    return { error: "답변이 달린 방명록은 삭제할 수 없습니다." };
  }

  await prisma.guestbook.delete({
    where: {
      uuid,
    },
  });

  revalidatePath(`/@${guestbook.blog.slug}/guestbook`);

  redirect(`/@${guestbook.blog.slug}/guestbook`);
}

export async function followBlog(formData: FormData) {
  const blogId = formData.get("blogId") as string;

  const { user } = await validateRequest();

  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  const currentUser = await prisma.user.findUnique({
    where: {
      id: user.id,
    },
    include: {
      blog: true,
    },
  });

  if (!currentUser) {
    return { error: "로그인이 필요합니다." };
  }

  if (!currentUser.blog) {
    return { error: "블로그를 만들어야 팔로우할 수 있습니다." };
  }

  const blog = await prisma.blog.findUnique({
    where: {
      slug: blogId,
    },
  });

  if (!blog) {
    return { error: "블로그를 찾을 수 없습니다." };
  }

  if (user.id === blog.userId) {
    return { error: "자신의 블로그를 팔로우할 수 없습니다." };
  }

  try {
    await prisma.follow.create({
      data: {
        followerId: currentUser.blog.id,
        followingId: blog.id,
      },
    });
  } catch {}

  revalidatePath(`/@${blogId}`);
  redirect(`/@${blogId}`);
}

export async function unfollowBlog(formData: FormData) {
  const blogId = formData.get("blogId") as string;

  const { user } = await validateRequest();

  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  const currentUser = await prisma.user.findUnique({
    where: {
      id: user.id,
    },
    include: {
      blog: true,
    },
  });

  if (!currentUser) {
    return { error: "로그인이 필요합니다." };
  }

  if (!currentUser.blog) {
    return { error: "블로그를 만들어야 팔로우할 수 있습니다." };
  }

  const blog = await prisma.blog.findUnique({
    where: {
      slug: blogId,
    },
  });

  if (!blog) {
    return { error: "블로그를 찾을 수 없습니다." };
  }

  if (user.id === blog.userId) {
    return { error: "자신의 블로그를 팔로우할 수 없습니다." };
  }

  try {
    await prisma.follow.delete({
      where: {
        followerId_followingId: {
          followerId: currentUser.blog.id,
          followingId: blog.id,
        },
      },
    });
  } catch {}

  revalidatePath(`/@${blogId}`);
  redirect(`/@${blogId}`);
}

async function assertCurrentUserHasBlogWithIdAndPostWithId(
  blogId: string,
  postId: string
) {
  const { user } = await validateRequest();
  if (!user) {
    throw new Error("사용자가 없습니다.");
  }

  const post = await prisma.post.findUnique({
    where: {
      uuid: postId,
      blog: {
        slug: blogId,
        userId: user.id,
      },
    },
  });

  if (!post) {
    throw new Error("글을 찾을 수 없습니다.");
  }

  return post;
}

export async function publishPost(blogId: string, postId: string) {
  const uuid = decodePostId(postId);
  await assertCurrentUserHasBlogWithIdAndPostWithId(blogId, uuid);

  await prisma.post.update({
    where: {
      uuid,
    },
    data: {
      publishedAt: new Date(),
    },
  });
}

export async function unPublishPost(blogId: string, postId: string) {
  const uuid = decodePostId(postId);
  await assertCurrentUserHasBlogWithIdAndPostWithId(blogId, uuid);

  await prisma.post.update({
    where: {
      uuid,
    },
    data: {
      publishedAt: null,
    },
  });
}

export async function deletePost(blogId: string, postId: string) {
  const uuid = decodePostId(postId);
  await assertCurrentUserHasBlogWithIdAndPostWithId(blogId, uuid);

  await prisma.post.update({
    where: {
      uuid,
    },
    data: {
      title: null,
      content: null,
      deletedAt: new Date(),
    },
  });

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
  const { user } = await validateRequest();
  if (!user) {
    throw new Error("사용자가 없습니다.");
  }

  const blog = await prisma.blog.findFirst({
    where: {
      slug: blogSlug,
      userId: user.id,
    },
  });

  if (!blog) {
    throw new Error("블로그를 찾을 수 없습니다.");
  }

  const uuid = postId ? decodePostId(postId) : undefined;

  let post;
  if (uuid) {
    post = await prisma.post.update({
      where: {
        uuid,
      },
      data: {
        title,
        content,
        publishedAt,
      },
    });
  } else {
    post = await prisma.post.create({
      data: {
        title,
        content,
        publishedAt,
        blog: {
          connect: {
            slug: blogSlug,
          },
        },
      },
    });
  }

  return {
    success: true,
    postId: encodePostId(post.uuid),
  };
}

export async function editBlogInfo(
  blogSlug: string,
  name: string,
  description: string,
  discoverable: boolean
) {
  const { user } = await validateRequest();
  if (!user) {
    throw new Error("사용자가 없습니다.");
  }

  const blog = await prisma.blog.findFirst({
    where: {
      slug: blogSlug,
      userId: user.id,
    },
  });

  if (!blog) {
    throw new Error("블로그를 찾을 수 없습니다.");
  }

  await prisma.blog.update({
    where: {
      id: blog.id,
    },
    data: {
      name,
      description,
      discoverable,
    },
  });

  return {
    success: true,
  };
}
