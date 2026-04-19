import { assertAdmin } from "@/lib/server-util";
import { getCurrentSession } from "@/lib/auth";
import AdminToggleButton from "../admin-toggle-button";
import ImpersonateButton from "../impersonate-button";
import { db } from "@/lib/db";
import { blog, session, user } from "@/drizzle/schema";
import { desc, eq, sql } from "drizzle-orm";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">사용자</h1>
      <Table>
        <TableCaption>가입순</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>이메일</TableHead>
            <TableHead>블로그</TableHead>
            <TableHead>가입일</TableHead>
            <TableHead>최근 로그인</TableHead>
            <TableHead>관리자</TableHead>
            <TableHead>흉내내기</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id}>
              <TableCell>{u.email}</TableCell>
              <TableCell>{u.blogSlug ?? "-"}</TableCell>
              <TableCell>
                {new Date(u.created).toLocaleDateString("ko-KR")}
              </TableCell>
              <TableCell>
                {u.lastLogin
                  ? new Date(u.lastLogin).toLocaleDateString("ko-KR")
                  : "-"}
              </TableCell>
              <TableCell>
                <AdminToggleButton
                  userId={u.id}
                  isAdmin={u.isAdmin}
                  disabled={u.id === currentUser?.id}
                />
              </TableCell>
              <TableCell>
                <ImpersonateButton userId={u.id} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
