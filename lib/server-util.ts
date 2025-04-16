import { redirect } from "next/navigation";
import { getCurrentSession } from "./auth";
import { getLoginPath, getRootPath } from "./paths";

export async function assertAdmin() {
  const { user } = await getCurrentSession();

  if (!user) {
    redirect(getLoginPath());
  }

  if (user.id !== +process.env.ADMIN_USER_ID!) {
    redirect(getRootPath());
  }
}
