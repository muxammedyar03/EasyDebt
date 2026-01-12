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

  if (!debtor) {
    notFound();
  }

  return <DebtorDetailClient debtor={debtor} />;
}
