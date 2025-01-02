import { redirect } from "next/navigation";
import { validateRequest } from "./auth";
import { prisma } from "./db";
import { getLoginPath, getRootPath } from "./paths";

export async function assertAdmin() {
  const { user } = await validateRequest();

  if (!user) {
    redirect(getLoginPath());
  }

  if (user.id !== +process.env.ADMIN_USER_ID!) {
    redirect(getRootPath());
  }
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
