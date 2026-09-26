import ReauthenticationForm from "@/components/ReauthenticationForm";
import { getCurrentSession, isRecentlyAuthenticated } from "@/lib/auth";
import SetPasswordForm from "./form";

export default async function SetPasswordPage() {
  const { user, session } = await getCurrentSession();

  if (!user) {
    return <p>로그인이 필요합니다.</p>;
  }

  if (!isRecentlyAuthenticated(session)) {
    return (
      <ReauthenticationForm
        email={user.email}
        hasPassword={!!user.passwordHash}
      />
    );
  }

  return <SetPasswordForm email={user.email} />;
}
