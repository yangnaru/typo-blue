import { redirect } from "next/navigation";
import { getCurrentSession } from "./auth";
import { getLoginPath, getRootPath } from "./paths";

export async function assertAdmin() {
  const { user } = await getCurrentSession();

  if (!user) {
    redirect(getLoginPath());
  }

  if (!user.isAdmin) {
    redirect(getRootPath());
  }
}
