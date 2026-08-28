import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { CreateClientDialog } from "@/app/(main)/dashboard/users/_components/create-client-dialog";
import { CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { ClientsList } from "./_components/clients-list";

export default async function ClientsPage() {
  const t = await getTranslations("clients");
  const session = await getSession();

  if (!session || session.role !== "SUPER_ADMIN") {
    redirect("/unauthorized");
  }

  const clients = await prisma.client.findMany({
    orderBy: { created_at: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      is_active: true,
      created_at: true,
      _count: { select: { users: true, debtors: true } },
    },
  });

  const rows = clients.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    is_active: c.is_active,
    created_at: c.created_at.toISOString(),
    users_count: c._count.users,
    debtors_count: c._count.debtors,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle>{t("pageTitle")}</CardTitle>
          <p className="text-muted-foreground mt-2 text-sm">{t("pageSubtitle")}</p>
        </div>
        <CreateClientDialog />
      </div>
      <div className="rounded-md border">
        <ClientsList clients={rows} currentClientId={session.clientId} />
      </div>
    </div>
  );
}
