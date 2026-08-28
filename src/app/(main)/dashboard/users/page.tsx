import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth";
import { CreateUserForm } from "./_components/create-user-form";
import { UsersList } from "./_components/users-list";
import { prisma } from "@/lib/prisma";

export default async function UsersPage() {
  const t = await getTranslations("users");
  const session = await getSession();

  if (!session || !["SUPER_ADMIN", "ADMIN"].includes(session.role)) {
    redirect("/unauthorized");
  }

  const isSuperAdmin = session.role === "SUPER_ADMIN";

  const [users, clients] = await Promise.all([
    prisma.user.findMany({
      where: { client_id: session.clientId },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        first_name: true,
        last_name: true,
        is_active: true,
        created_at: true,
        client_id: true,
      },
      orderBy: {
        created_at: "desc",
      },
    }),
    isSuperAdmin
      ? prisma.client.findMany({
          where: { is_active: true },
          select: { id: true, name: true, slug: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const serializedUsers = users.map((user) => ({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    first_name: user.first_name,
    last_name: user.last_name,
    is_active: user.is_active,
    created_at: user.created_at.toISOString(),
    client_id: user.client_id,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle>{t("title")}</CardTitle>
          <p className="text-muted-foreground mt-2 text-sm">{t("subtitle")}</p>
        </div>
        {isSuperAdmin && <CreateUserForm clients={clients} defaultClientId={session.clientId} />}
      </div>
      <div className="rounded-md border">
        <UsersList users={serializedUsers} role={session.role} />
      </div>
    </div>
  );
}
