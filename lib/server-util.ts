import {
  encode as base62encode,
  decode as base62decode,
} from "@urlpack/base62";
import { prisma } from "./db";
import { Client } from "@opensearch-project/opensearch/.";

export function encodePostId(uuid: string) {
  return base62encode(Buffer.from(uuid.replaceAll("-", ""), "hex"));
}

export function decodePostId(id: string) {
  return Buffer.from(base62decode(id)).toString("hex");
}

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

export async function logView(
  ip: string,
  blogId: number,
  postId: string | null
) {
  const client = new Client({
    node: process.env.OPENSEARCH_NODE,
  });

  await client.index({
    index: process.env.OPENSEARCH_VIEWS_INDEX!,
    body: {
      ip,
      blog_id: blogId,
      post_id: postId,
      "@timestamp": new Date().toISOString(),
    },
  });
}
