import { notFound } from "next/navigation";
import { DebtorDetailClient } from "./_components/debtor-detail-client";
import { debtorService } from "@/lib/services/debtor.service";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function DebtorDetailPage({ params }: PageProps) {
  const { id } = await params;
  const debtorId = parseInt(id);

  if (isNaN(debtorId)) {
    notFound();
  }

  const debtor = await debtorService.findById(Number(id), true);
  const overdueDays = await debtorService.getOverdueDays();

  // console.log(debtor);

  if (!debtor) {
    notFound();
  }

  // console.log({ debtor, debts: debtor.debts, payments: debtor.payments });

  return <DebtorDetailClient debtor={debtor} overdueDays={overdueDays} />;
}
