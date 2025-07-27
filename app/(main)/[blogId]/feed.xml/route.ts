import { db } from "@/lib/db";
import { encodePostId } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";
import { create } from "xmlbuilder2";

type Params = Promise<{
  blogId: string;
}>;

export async function GET(req: NextRequest, props: { params: Params }) {
  const handle = (await props.params).blogId;
  const slug = handle.replace("@", "");
  const targetBlog = await db.query.blog.findFirst({
    where: (blogs, { eq }) => eq(blogs.slug, slug),
    with: {
      posts: {
        where: (posts, { isNotNull }) => isNotNull(posts.published),
        orderBy: (posts, { desc }) => [desc(posts.published)],
        limit: 10,
      },
    },
  });

  if (!targetBlog) {
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
      href: `${url}/@${targetBlog.slug}/feed.xml`,
      type: "application/atom+xml",
    })
    .up()
    .ele("link", {
      rel: "alternate",
      href: `${url}/@${targetBlog.slug}`,
      type: "text/html",
    })
    .up()
    .ele("id")
    .txt(`${url}/@${targetBlog.slug}/feed.xml`)
    .up()
    .ele("title", { type: "html" })
    .txt(targetBlog.name || handle)
    .up()
    .ele("subtitle")
    .txt(targetBlog.description || "")
    .up();

  if (targetBlog.posts.length > 0) {
    root.ele("updated").txt(targetBlog.posts[0].published!.toISOString()).up();
  }

  for (const post of targetBlog.posts) {
    const entry = root.ele("entry");
    const postSlug = encodePostId(post.id);
    entry.ele("title", { type: "html" }).txt(post.title || "무제");
    entry.ele("id").txt(`${url}/@${targetBlog.slug}/${postSlug}`);
    entry
      .ele("author")
      .ele("name")
      .txt(targetBlog.name || handle);
    entry.ele("link", {
      rel: "alternate",
      href: `${url}/@${targetBlog.slug}/${postSlug}`,
      type: "text/html",
      title: post.title,
    });
    entry.ele("published").txt((post.first_published || post.published)!.toISOString());
    entry.ele("updated").txt(post.updated!.toISOString());
    entry.ele("content", { type: "html" }).txt(post.content || "");
  }

  return new NextResponse(root.end(), {
    headers: {
      "Content-Type": "application/xml",
    },
  });
}
