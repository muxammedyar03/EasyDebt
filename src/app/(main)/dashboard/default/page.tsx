import { ChartAreaInteractive } from "./_components/chart-area-interactive";
import { DataTable } from "./_components/data-table";
import { SectionCards } from "./_components/section-cards";
import { prisma } from "@/lib/prisma";

export default async function Page() {
  const debtorsRaw = await prisma.debtor.findMany({
    include: {
      debts: true,
      payments: true,
    },
  });
  
  // Convert Decimal to number for type compatibility
  const debtors = debtorsRaw.map((debtor) => ({
    ...debtor,
    total_debt: debtor.total_debt.toNumber(),
  }));

  // Calculate statistics
  const totalDebtors = debtors.length;
  const totalDebt = debtors.reduce((sum, debtor) => sum + debtor.total_debt, 0);
  
  const totalDebtsCount = debtorsRaw.reduce((sum, debtor) => sum + debtor.debts.length, 0);
  const totalDebtsAmount = debtorsRaw.reduce(
    (sum, debtor) => sum + debtor.debts.reduce((s, debt) => s + debt.amount.toNumber(), 0),
    0
  );
  
  const totalPaymentsCount = debtorsRaw.reduce((sum, debtor) => sum + debtor.payments.length, 0);
  const totalPaymentsAmount = debtorsRaw.reduce(
    (sum, debtor) => sum + debtor.payments.reduce((s, payment) => s + payment.amount.toNumber(), 0),
    0
  );

  // Calculate today's debts
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todayDebts = debtorsRaw.reduce((acc, debtor) => {
    const todayDebtsList = debtor.debts.filter(debt => {
      const debtDate = new Date(debt.created_at);
      debtDate.setHours(0, 0, 0, 0);
      return debtDate.getTime() === today.getTime();
    });
    
    return {
      count: acc.count + todayDebtsList.length,
      amount: acc.amount + todayDebtsList.reduce((sum, debt) => sum + debt.amount.toNumber(), 0),
    };
  }, { count: 0, amount: 0 });

  const stats = {
    totalDebtors,
    totalDebt,
    totalDebtsCount,
    totalDebtsAmount,
    totalPaymentsCount,
    totalPaymentsAmount,
    todayDebtsCount: todayDebts.count,
    todayDebtsAmount: todayDebts.amount,
  };

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <DataTable data={debtors} />
      <SectionCards stats={stats} />
      <ChartAreaInteractive />
    </div>
  );
}
