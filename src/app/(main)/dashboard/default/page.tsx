import { prisma } from "@/lib/prisma";
import { OverdueDebtorsCard } from "@/components/dashboard/overdue-debtors-card";
import { CustomerRatingCard } from "@/components/dashboard/customer-rating-card";
import { ReportsCard } from "./_components/reports-card";

import { ChartAreaInteractive } from "./_components/chart-area-interactive";
import { DataTable } from "./_components/data-table";
import { SectionCards } from "./_components/section-cards";
import { Payment } from "@prisma/client";

export default async function Page() {
  const debtorsRaw = await prisma.debtor.findMany({
    include: {
      debts: true,
      payments: true,
    },
  });

  // Get overdue debtors
  const overdueDebtorsRaw = await prisma.debtor.findMany({
    where: {
      is_overdue: true,
      total_debt: { gt: 0 },
    },
    orderBy: { last_payment_date: "asc" },
    take: 10,
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

  // Calculate customer ratings (last 3 months)
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const recentPayments = await prisma.payment.findMany({
    where: {
      created_at: {
        gte: threeMonthsAgo,
      },
    },
    include: {
      debtor: true,
    },
    orderBy: {
      created_at: "desc",
    },
  });

  // Group payments by debtor and calculate ratings
  const paymentsByDebtor = new Map<number, Payment[]>();
  recentPayments.forEach((payment) => {
    const existing = paymentsByDebtor.get(payment.debtor_id) || [];
    existing.push(payment);
    paymentsByDebtor.set(payment.debtor_id, existing);
  });

  let goodCount = 0;
  let averageCount = 0;
  let badCount = 0;

  paymentsByDebtor.forEach((debtorPayments) => {
    if (debtorPayments.length < 2) return;

    const sorted = debtorPayments.sort((a, b) => a.created_at.getTime() - b.created_at.getTime());
    let totalDays = 0;
    let count = 0;

    for (let i = 1; i < sorted.length; i++) {
      const days = Math.floor(
        (sorted[i].created_at.getTime() - sorted[i - 1].created_at.getTime()) / (1000 * 60 * 60 * 24),
      );
      totalDays += days;
      count++;
    }

    const avgDays = count > 0 ? totalDays / count : 0;

    if (avgDays <= 45) {
      goodCount++;
    } else if (avgDays <= 55) {
      averageCount++;
    } else {
      badCount++;
    }
  });

  const overdueDebtors = overdueDebtorsRaw.map((debtor) => ({
    ...debtor,
    total_debt: debtor.total_debt.toNumber(),
  }));

  return (
    <div className="@container/main flex flex-col gap-4 bg-red-400 md:gap-6">
      <DataTable data={debtors} debtLimit={debtLimit} />

      {/* Overdue Debtors Alert */}
      {overdueDebtors.length > 0 && <OverdueDebtorsCard debtors={overdueDebtors} />}

      {/* Statistics Cards */}
      <SectionCards stats={stats} />

      {/* New Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 md:gap-6">
        <CustomerRatingCard
          goodCount={goodCount}
          averageCount={averageCount}
          badCount={badCount}
          totalCount={goodCount + averageCount + badCount}
        />
        <ReportsCard />
      </div>

      {/* Chart */}
      <ChartAreaInteractive chartData={chartData} />
    </div>
  );
}
