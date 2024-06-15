import CreateNewBlogForm from "@/components/CreateNewBlogForm";
import { validateRequest } from "@/lib/auth";

export default async function NewBlogPage() {
  const { user } = await validateRequest();
  if (!user) {
    return <p>로그인이 필요합니다.</p>;
  }

  return <CreateNewBlogForm />;
}
