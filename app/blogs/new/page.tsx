import CreateNewBlogForm from "@/components/CreateNewBlogForm";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";

export default async function NewBlogPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        return <p>로그인이 필요합니다.</p>
    }

    return <CreateNewBlogForm />
}
