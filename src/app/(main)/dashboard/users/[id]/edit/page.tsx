import { redirect, notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { EditUserForm } from "../../_components/edit-user-form";

interface EditUserPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditUserPage({ params }: EditUserPageProps) {
  const t = await getTranslations("users");
  const session = await getSession();

  if (!session || session.role !== "SUPER_ADMIN") {
    redirect("/unauthorized");
  }

  const { id } = await params;
  const userId = parseInt(id, 10);
  if (Number.isNaN(userId)) notFound();

  const user = await prisma.user.findFirst({
    where: { id: userId, client_id: session.clientId },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      first_name: true,
      last_name: true,
      is_active: true,
    },
  });

  if (!user) notFound();

  const serializedUser = {
    id: user.id,
    username: user.username,
    email: user.email ?? "",
    role: user.role,
    first_name: user.first_name ?? "",
    last_name: user.last_name ?? "",
    is_active: user.is_active,
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{t("editTitle")}</h2>
        <p className="text-muted-foreground text-sm">{t("editSubtitle", { username: serializedUser.username })}</p>
      </div>
      <Card>
        <CardContent>
          <EditUserForm user={serializedUser} />
        </CardContent>
      </Card>
    </div>
  );
}
