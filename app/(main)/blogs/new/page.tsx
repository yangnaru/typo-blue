import CreateNewBlogForm from "@/components/CreateNewBlogForm";
import { getCurrentSession } from "@/lib/auth";

export default async function NewBlogPage() {
  const { user } = await getCurrentSession();
  if (!user) {
    return <p>로그인이 필요합니다.</p>;
  }

  return <CreateNewBlogForm />;
}
