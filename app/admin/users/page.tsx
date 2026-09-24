import { formatInTimeZone } from "date-fns-tz";
import { assertAdmin } from "@/lib/server-util";
import { getCurrentSession } from "@/lib/auth";
import AdminToggleButton from "../admin-toggle-button";
import ImpersonateButton from "../impersonate-button";
import { db } from "@/lib/db";
import { blog, session, user } from "@/drizzle/schema";
import { desc, eq, sql } from "drizzle-orm";

export default async function UsersPage() {
  await assertAdmin();
  const { user: currentUser } = await getCurrentSession();

  const users = await db
    .select({
      id: user.id,
      email: user.email,
      created: user.created,
      isAdmin: user.isAdmin,
      blogSlug: blog.slug,
      lastLogin: sql<string | null>`(
        SELECT MAX(${session.expires}) FROM ${session}
        WHERE ${session.userId} = ${user.id}
      ) - INTERVAL '30 days'`.as("last_login"),
    })
    .from(user)
    .leftJoin(blog, eq(blog.userId, user.id))
    .orderBy(desc(user.created));

  return (
    <div className="space-y-4">
      <h3 className="text-xl">사용자</h3>
      <p className="text-neutral-500">가입한 순서대로 {users.length}명</p>
      <ul className="space-y-4">
        {users.map((u) => (
          <li key={u.id} className="space-y-1 break-all">
            <p>
              <span className="font-bold tabular-nums">
                {formatInTimeZone(u.created, "Asia/Seoul", "yyyy-MM-dd")}
              </span>{" "}
              {u.email}
              {u.isAdmin && <span className="text-blue-500"> · 관리자</span>}
            </p>
            <p className="text-neutral-500 text-sm">
              블로그 {u.blogSlug ? `@${u.blogSlug}` : "없음"} · 최근 로그인{" "}
              {u.lastLogin
                ? formatInTimeZone(new Date(u.lastLogin), "Asia/Seoul", "yyyy-MM-dd")
                : "-"}
            </p>
            <div className="flex flex-row gap-2 text-sm">
              <AdminToggleButton
                userId={u.id}
                isAdmin={u.isAdmin}
                disabled={u.id === currentUser?.id}
              />
              <ImpersonateButton userId={u.id} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
