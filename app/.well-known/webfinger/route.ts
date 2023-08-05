import { prisma } from "@/lib/db";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const resource = searchParams.get("resource")

    if (!resource) {
        return {
            status: 400,
        };
    }

    const email = resource.split(":")[1];
    const slug = email.split("@")[0];
    const username = slug.replace('@', '');

    const blog = await prisma.blog.findFirst({
        where: {
            slug,
        },
    });

    if (!blog) {
        return new NextResponse("Account not found", {
            status: 404,
        });
    }

    const url = process.env.NEXT_PUBLIC_URL;
    const response = {
        subject: `acct:${email}`,
        aliases: [
            `${url}/@${slug}`,
            `${url}/users/${username}`,
        ],
        links: [
            {
                rel: "http://webfinger.net/rel/profile-page",
                type: "text/html",
                href: `${url}/@${slug}`,
            },
            {
                rel: "self",
                type: "application/activity+json",
                href: `${url}/users/${username}`,
            },
        ],
    };

    return new Response(JSON.stringify(response), {
        status: 200,
        headers: {
            "Content-Type": "application/jrd+json",
        },
    });
}
