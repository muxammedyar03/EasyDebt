import { notFound } from "next/navigation";
import { DebtorDetailClient } from "./_components/debtor-detail-client";
import { debtorService } from "@/lib/services/debtor.service";
import { computeViewValueSync } from "@/features/view-debtor/model";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function DebtorDetailPage({ params }: PageProps) {
  const { id } = await params;

  if (!id || !UUID_REGEX.test(id)) {
    notFound();
  }

  const debtor = await debtorService.findByExternalId(id, true);
  const overdueDays = await debtorService.getOverdueDays();

  if (!debtor) {
    notFound();
  }

  const initialViewValue = computeViewValueSync(debtor, overdueDays);
  return <DebtorDetailClient debtor={debtor} overdueDays={overdueDays} initialViewValue={initialViewValue} />;
}
