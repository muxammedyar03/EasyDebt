import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DebtorDetailClient } from "./_components/debtor-detail-client";

interface PageProps {
  params: {
    id: string;
  };
}

export default async function DebtorDetailPage({ params }: PageProps) {
  const debtorId = parseInt(params.id);

  if (isNaN(debtorId)) {
    notFound();
  }

  const debtor = await prisma.debtor.findUnique({
    where: { id: debtorId },
    include: {
      debts: {
        orderBy: { created_at: "desc" },
      },
      payments: {
        orderBy: { created_at: "desc" },
      },
    },
  });

  if (!debtor) {
    notFound();
  }

  // Convert Decimal to number
  const debtorData = {
    ...debtor,
    total_debt: debtor.total_debt.toNumber(),
    debts: debtor.debts.map((debt) => ({
      ...debt,
      amount: debt.amount.toNumber(),
    })),
    payments: debtor.payments.map((payment) => ({
      ...payment,
      amount: payment.amount.toNumber(),
    })),
  };

  return <DebtorDetailClient debtor={debtorData} />;
}
