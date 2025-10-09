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
    debts: debtor.debts.map((debt) => ({
      ...debt,
      amount: debt.amount.toNumber(),
    })),
    payments: debtor.payments.map((payment) => ({
      ...payment,
      amount: payment.amount.toNumber(),
    })),
  }));

  // Calculate statistics
  const totalDebtors = debtors.length;
  const totalDebt = debtors.reduce((sum, debtor) => sum + debtor.total_debt, 0);

  const totalDebtsCount = debtorsRaw.reduce((sum, debtor) => sum + debtor.debts.length, 0);
  const totalDebtsAmount = debtorsRaw.reduce(
    (sum, debtor) => sum + debtor.debts.reduce((s, debt) => s + debt.amount.toNumber(), 0),
    0,
  );

  const totalPaymentsCount = debtorsRaw.reduce((sum, debtor) => sum + debtor.payments.length, 0);
  const totalPaymentsAmount = debtorsRaw.reduce(
    (sum, debtor) => sum + debtor.payments.reduce((s, payment) => s + payment.amount.toNumber(), 0),
    0,
  );

  // Calculate today's debts
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayDebts = debtorsRaw.reduce(
    (acc, debtor) => {
      const todayDebtsList = debtor.debts.filter((debt) => {
        const debtDate = new Date(debt.created_at);
        debtDate.setHours(0, 0, 0, 0);
        return debtDate.getTime() === today.getTime();
      });

      return {
        count: acc.count + todayDebtsList.length,
        amount: acc.amount + todayDebtsList.reduce((sum, debt) => sum + debt.amount.toNumber(), 0),
      };
    },
    { count: 0, amount: 0 },
  );

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

  // Prepare chart data - group payments by date and payment type
  const allPayments = await prisma.payment.findMany({
    orderBy: {
      created_at: "asc",
    },
  });

  // Group payments by date
  const paymentsByDate = new Map<string, { cash: number; card: number; click: number }>();

  allPayments.forEach((payment) => {
    const dateStr = payment.created_at.toISOString().split("T")[0];
    const existing = paymentsByDate.get(dateStr) || { cash: 0, card: 0, click: 0 };

    const amount = payment.amount.toNumber();
    if (payment.payment_type === "CASH") {
      existing.cash += amount;
    } else if (payment.payment_type === "CARD") {
      existing.card += amount;
    } else if (payment.payment_type === "CLICK") {
      existing.click += amount;
    }

    paymentsByDate.set(dateStr, existing);
  });

  // Convert to array format for chart
  let chartData = Array.from(paymentsByDate.entries())
    .map(([date, amounts]) => ({
      date,
      cash: amounts.cash,
      card: amounts.card,
      click: amounts.click,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // If no data, generate sample data for last 30 days
  if (chartData.length === 0) {
    const sampleData = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      sampleData.push({
        date: date.toISOString().split("T")[0],
        cash: 0,
        card: 0,
        click: 0,
      });
    }
    chartData = sampleData;
  }

  // Get debt limit for status
  const debtLimitSetting = await prisma.settings.findUnique({
    where: { key: "debt_limit" },
  });
  const debtLimit = debtLimitSetting ? parseFloat(debtLimitSetting.value) : 2000000;
  //   { date: "2025-09-09", cash: 1050, card: 830,  click: 41 },
  //   { date: "2025-09-10", cash: 1130, card: 900,  click: 46 },
  //   { date: "2025-09-11", cash: 1210, card: 970,  click: 48 },
  //   { date: "2025-09-12", cash: 980,  card: 840,  click: 39 },
  //   { date: "2025-09-13", cash: 1030, card: 860,  click: 42 },
  //   { date: "2025-09-14", cash: 1090, card: 880,  click: 43 },
  //   { date: "2025-09-15", cash: 1150, card: 940,  click: 47 },
  //   { date: "2025-09-16", cash: 980,  card: 800,  click: 38 },
  //   { date: "2025-09-17", cash: 1010, card: 860,  click: 40 },
  //   { date: "2025-09-18", cash: 1120, card: 890,  click: 44 },
  //   { date: "2025-09-19", cash: 1180, card: 940,  click: 46 },
  //   { date: "2025-09-20", cash: 990,  card: 820,  click: 39 },
  //   { date: "2025-09-21", cash: 1020, card: 860,  click: 41 },
  //   { date: "2025-09-22", cash: 1070, card: 880,  click: 42 },
  //   { date: "2025-09-23", cash: 1130, card: 910,  click: 45 },
  //   { date: "2025-09-24", cash: 1200, card: 970,  click: 49 },
  //   { date: "2025-09-25", cash: 990,  card: 830,  click: 40 },
  //   { date: "2025-09-26", cash: 1040, card: 860,  click: 41 },
  //   { date: "2025-09-27", cash: 1090, card: 900,  click: 43 },
  //   { date: "2025-09-28", cash: 1170, card: 950,  click: 46 },
  //   { date: "2025-09-29", cash: 1000, card: 820,  click: 39 },
  //   { date: "2025-09-30", cash: 1120, card: 880,  click: 44 },
  //   { date: "2025-10-01", cash: 1130, card: 910,  click: 45 },
  //   { date: "2025-10-02", cash: 1200, card: 970,  click: 49 },
  //   { date: "2025-10-03", cash: 990,  card: 830,  click: 40 },
  //   { date: "2025-10-04", cash: 1040, card: 860,  click: 41 },
  //   { date: "2025-10-05", cash: 1090, card: 900,  click: 43 },
  //   { date: "2025-10-06", cash: 1170, card: 950,  click: 46 },
  //   { date: "2025-10-07", cash: 1000, card: 820,  click: 39 },
  //   { date: "2025-10-08", cash: 1120, card: 880,  click: 44 },
  // ];

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <DataTable data={debtors} debtLimit={debtLimit} />
      <SectionCards stats={stats} />
      <ChartAreaInteractive chartData={chartData} />
    </div>
  );
}
