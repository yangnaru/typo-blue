import fs from "fs";
import path from "path";
import { prisma } from "@/lib/db";
import { decode } from "@urlpack/base62";
import { ImageResponse } from "next/og";
import { fileURLToPath } from "url";
import { convert } from "html-to-text";

const size = {
  width: 1200,
  height: 630,
};

const contentType = "image/png";

// Image metadata
export async function generateImageMetadata({
  params: { blogId, guestbookId },
}: {
  params: {
    blogId: string;
    guestbookId: string;
  };
}) {
  const guestbook = await prisma.guestbook.findUnique({
    where: {
      uuid: Buffer.from(decode(guestbookId)).toString("hex"),
      blog: {
        slug: blogId.replace("%40", ""),
      },
    },
  });

  if (!guestbook) {
    return new ImageResponse(<div></div>);
  }

  return [
    {
      id: "og:image",
      size,
      alt: convert(guestbook.content),
      contentType,
    },
  ];
}

const font = fs.promises.readFile(
  path.join(
    fileURLToPath(import.meta.url),
    "../../../../../../public/Inter-SemiBold.ttf"
  )
);

// Image generation
export default async function Image({
  params: { blogId, guestbookId },
}: {
  params: {
    blogId: string;
    guestbookId: string;
  };
}) {
  const guestbook = await prisma.guestbook.findUnique({
    where: {
      uuid: Buffer.from(decode(guestbookId)).toString("hex"),
      blog: {
        slug: blogId.replace("%40", ""),
      },
    },
  });

  if (!guestbook) {
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
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {convert(guestbook.content)}
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
