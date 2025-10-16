import { redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth";
import { CreateUserForm } from "./_components/create-user-form";
import { UsersList } from "./_components/users-list";
import { prisma } from "@/lib/prisma";

export default async function UsersPage() {
  const session = await getSession();

  if (!session || session.role !== "SUPER_ADMIN") {
    redirect("/unauthorized");
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      first_name: true,
      last_name: true,
      is_active: true,
      created_at: true,
    },
    orderBy: {
      created_at: "desc",
    },
  });

  const serializedUsers = users.map((user) => ({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    first_name: user.first_name,
    last_name: user.last_name,
    is_active: user.is_active,
    created_at: user.created_at.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Foydalanuvchilar</CardTitle>
            <p className="text-muted-foreground mt-2 text-sm">
              Yangi foydalanuvchi qo&apos;shish va boshqarish. Faqat SUPER ADMIN uchun.
            </p>
          </div>
          <CreateUserForm />
        </CardHeader>
        <CardContent>
          <UsersList users={serializedUsers} />
        </CardContent>
      </Card>
    </div>
  );
}
