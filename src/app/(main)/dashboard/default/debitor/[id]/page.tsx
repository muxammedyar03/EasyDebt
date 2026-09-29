import { hasPermission } from "@/lib/security/permission-access";
import { notFound, redirect } from "next/navigation";
import { DebtorDetailClient } from "./_components/debtor-detail-client";
import { debtorService } from "@/lib/services/debtor.service";
import { getSession } from "@/lib/auth";
import { requireClientId } from "@/lib/tenant";
import { computeViewValueSync } from "@/features/view-debtor/model";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function DebtorDetailPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/auth/login");
  if (!(await hasPermission(session, "debtors.view"))) redirect("/unauthorized");
  const clientId = requireClientId(session);
  const { id } = await params;

  if (!id || !UUID_REGEX.test(id)) {
    notFound();
  }

  const debtor = await debtorService.findByExternalId(clientId, id, true);
  const overdueDays = await debtorService.getOverdueDays(clientId);

  if (!debtor) {
    notFound();
  }

  const initialViewValue = computeViewValueSync(debtor, overdueDays);
  return <DebtorDetailClient debtor={debtor} overdueDays={overdueDays} initialViewValue={initialViewValue} />;
}

