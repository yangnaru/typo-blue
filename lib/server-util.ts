import { prisma } from "./db";
import { Client } from "@opensearch-project/opensearch/.";

export async function incrementVisitorCount(blogId: number) {
  await prisma.blog.update({
    where: {
      id: blogId,
    },
    data: {
      visitorCount: {
        increment: 1,
      },
    },
  });
}

export async function logView({
  ip,
  userAgent,
  blogId,
  postId = null,
}: {
  ip: string;
  userAgent: string;
  blogId: number;
  postId?: string | null;
}) {
  const client = new Client({
    node: process.env.OPENSEARCH_NODE,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  await client.index({
    index: process.env.OPENSEARCH_VIEWS_INDEX!,
    body: {
      ip,
      user_agent: userAgent,
      blog_id: blogId,
      post_id: postId,
      "@timestamp": new Date().toISOString(),
    },
  });
}
