import { prisma } from "@/lib/db";
import { encodePostId } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";
import { create } from "xmlbuilder2";

export async function GET(
  req: NextRequest,
  { params }: { params: { blogId: string } }
) {
  const handle = params.blogId;
  const slug = handle.replace("@", "");
  const blog = await prisma.blog.findUnique({
    where: {
      slug,
    },
    include: {
      posts: {
        where: {
          publishedAt: {
            not: null,
          },
        },
        orderBy: {
          publishedAt: "desc",
        },
        take: 10,
      },
    },
  });

  if (!blog) {
    return new NextResponse(`<h1>Blog not found</h1>`, {
      status: 404,
      headers: {
        "Content-Type": "text/html",
      },
    });
  }

  const url = process.env.NEXT_PUBLIC_URL;
  const root = create({ version: "1.0", encoding: "utf-8" })
    .ele("feed", { xmlns: "http://www.w3.org/2005/Atom" })
    .ele("generator", {
      uri: url,
    })
    .txt("typo.blue")
    .up()
    .ele("link", {
      rel: "self",
      href: `${url}/@${blog.slug}/feed.xml`,
      type: "application/atom+xml",
    })
    .up()
    .ele("link", {
      rel: "alternate",
      href: `${url}/@${blog.slug}`,
      type: "text/html",
    })
    .up()
    .ele("id")
    .txt(`${url}/@${blog.slug}/feed.xml`)
    .up()
    .ele("title", { type: "html" })
    .txt(blog.name || handle)
    .up()
    .ele("subtitle")
    .txt(blog.description || "")
    .up();

  if (blog.posts.length > 0) {
    root.ele("updated").txt(blog.posts[0].publishedAt!.toISOString()).up();
  }

  for (const post of blog.posts) {
    const entry = root.ele("entry");
    const postSlug = encodePostId(post.uuid);
    entry.ele("title", { type: "html" }).txt(post.title || "무제");
    entry.ele("id").txt(`${url}/@${blog.slug}/${postSlug}`);
    entry
      .ele("author")
      .ele("name")
      .txt(blog.name || handle);
    entry.ele("link", {
      rel: "alternate",
      href: `${url}/@${blog.slug}/${postSlug}`,
      type: "text/html",
      title: post.title,
    });
    entry.ele("published").txt(post.publishedAt!.toISOString());
    entry.ele("updated").txt(post.updatedAt!.toISOString());
    entry.ele("content", { type: "html" }).txt(post.content || "");
  }

  return new NextResponse(root.end(), {
    headers: {
      "Content-Type": "application/xml",
    },
  });
}
