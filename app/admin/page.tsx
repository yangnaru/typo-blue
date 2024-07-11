import { assertAdmin } from "@/lib/server-util";

export default async function AdminRootPage() {
  await assertAdmin();

  return (
    <div>
      <h1>Admin</h1>
    </div>
  );
}
