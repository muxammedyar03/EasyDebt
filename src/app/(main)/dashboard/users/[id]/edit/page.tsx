import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { EditUserForm } from "../../_components/edit-user-form";

interface EditUserPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditUserPage({ params }: EditUserPageProps) {
  const session = await getSession();

  if (!session || session.role !== "SUPER_ADMIN") {
    redirect("/unauthorized");
  }

  const { id } = await params;
  const userId = parseInt(id, 10);
  if (Number.isNaN(userId)) notFound();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      first_name: true,
      last_name: true,
      status: true,
      shop_id: true,
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
    is_active: user.status === "ACTIVE",
    status: user.status,
    shop_id: user.shop_id,
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Foydalanuvchini tahrirlash</h2>
        <p className="text-muted-foreground text-sm">
          {serializedUser.username} — ma&apos;lumotlarni o&apos;zgartiring yoki rolni yangilang.
        </p>
      </div>
      <Card>
        <CardContent>
          <EditUserForm user={serializedUser} />
        </CardContent>
      </Card>
    </div>
  );
}
