import fs from "fs";
import path from "path";
import { prisma } from "@/lib/db";
import { decode } from "@urlpack/base62";
import { ImageResponse } from "next/og";
import { fileURLToPath } from "url";
import { convert } from "html-to-text";
import formatInTimeZone from "date-fns-tz/formatInTimeZone";

const size = {
  width: 1200,
  height: 630,
};

const contentType = "image/png";

// Image metadata
export async function generateImageMetadata({
  params: { blogId, postId },
}: {
  params: {
    blogId: string;
    postId: string;
  };
}) {
  const post = await prisma.post.findUnique({
    where: {
      uuid: Buffer.from(decode(postId)).toString("hex"),
      blog: {
        slug: blogId.replace("%40", ""),
      },
    },
  });

  if (!post) {
    return new ImageResponse(<div></div>);
  }

  return [
    {
      id: "og:image",
      size,
      alt: convert(post.title ?? ""),
      contentType,
    },
  ];
}

const font = fs.promises.readFile(
  path.join(
    fileURLToPath(import.meta.url),
    "../../../../../public/Inter-SemiBold.ttf"
  )
);

// Image generation
export default async function Image({
  params: { blogId, postId },
}: {
  params: {
    blogId: string;
    postId: string;
  };
}) {
  const post = await prisma.post.findUnique({
    where: {
      uuid: Buffer.from(decode(postId)).toString("hex"),
      blog: {
        slug: blogId.replace("%40", ""),
      },
    },
  });

  if (!post) {
    return new ImageResponse(<div></div>);
  }

  if (!post.publishedAt) {
    return new ImageResponse(<div></div>);
  }

  return new ImageResponse(
    (
      // ImageResponse JSX element
      <div
        style={{
          fontSize: 48,
          background: "white",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <p style={{ wordBreak: "keep-all" }}>{post.title}</p>
        <p>
          {formatInTimeZone(
            post.publishedAt ?? post.updatedAt,
            process.env.TZ!,
            "yyyy-MM-dd HH:mm"
          )}
        </p>
      </div>
    ),
    // ImageResponse options
    {
      // For convenience, we can re-use the exported opengraph-image
      // size config to also set the ImageResponse's width and height.
      ...size,
      fonts: [
        {
          name: "Inter",
          data: await font,
          style: "normal",
          weight: 400,
        },
      ],
    }
  );
}
