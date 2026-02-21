import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { reportsService } from "@/lib/services/reports.service";
import CashClient from "./_components/cash-client";
import { debtService } from "@/lib/services/debt.service";
import { getSession } from "@/lib/auth";
import { getEffectiveShopId } from "@/lib/shop-context";

export default async function ReportsPage() {
  const session = await getSession();
  const shopId = getEffectiveShopId(session);
  const [report, debtLimit] = await Promise.all([
    reportsService.getDashboardReport(shopId ?? 0),
    debtService.debtLimit(),
  ]);
/*
  // Get all debtors
  const debtorsRaw = await prisma.debtor.findMany({
    include: {
      debts: true,
      payments: true,
    },
  });

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

  // Get debt limit
  const debtLimitSetting = await prisma.settings.findUnique({
    where: { key: "debt_limit" },
  });
  const debtLimit = debtLimitSetting ? parseFloat(debtLimitSetting.value) : 2000000;

  // Get overdue debtors
  const overdueDebtorsRaw = await prisma.debtor.findMany({
    where: {
      is_overdue: true,
      total_debt: { gt: 0 },
    },
  });

  // Calculate risk analysis
  const totalDebtors = debtors.length;
  const highRiskCount = debtors.filter((d) => d.total_debt > debtLimit && d.total_debt > 0).length;
  const overdueCount = overdueDebtorsRaw.length;
  const mediumRiskCount = debtors.filter((d) => d.total_debt > 0 && d.total_debt <= debtLimit && !d.is_overdue).length;
  const lowRiskCount = debtors.filter((d) => d.total_debt <= 0).length;

  // Get all payments
  const allPayments = await prisma.payment.findMany({
    orderBy: {
      created_at: "asc",
    },
  });

  // Calculate trend analysis
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const currentMonthPayments = allPayments.filter(
    (p) => new Date(p.created_at) >= currentMonthStart && new Date(p.created_at) <= now,
  );
  const previousMonthPayments = allPayments.filter(
    (p) => new Date(p.created_at) >= previousMonthStart && new Date(p.created_at) <= previousMonthEnd,
  );

  const currentMonthDebts = await prisma.debt.findMany({
    where: {
      created_at: {
        gte: currentMonthStart,
        lte: now,
      },
    },
  });

  const previousMonthDebts = await prisma.debt.findMany({
    where: {
      created_at: {
        gte: previousMonthStart,
        lte: previousMonthEnd,
      },
    },
  });

  const trends = [
    {
      label: "To'lovlar",
      current: currentMonthPayments.reduce((sum, p) => sum + p.amount.toNumber(), 0),
      previous: previousMonthPayments.reduce((sum, p) => sum + p.amount.toNumber(), 0),
      format: "currency" as const,
    },
    {
      label: "Qarzlar",
      current: currentMonthDebts.reduce((sum, d) => sum + d.amount.toNumber(), 0),
      previous: previousMonthDebts.reduce((sum, d) => sum + d.amount.toNumber(), 0),
      format: "currency" as const,
    },
    {
      label: "To'lovlar soni",
      current: currentMonthPayments.length,
      previous: previousMonthPayments.length,
      format: "number" as const,
    },
  ];

  const payments = await prisma.payment.findMany({
    include: {
      debtor: true,
    },
    orderBy: {
      created_at: "desc",
    },
  });

  const debts = await prisma.debt.findMany({
    include: {
      debtor: true,
    },
    orderBy: {
      created_at: "desc",
    },
  });

  const paymentsData = payments.map((payment) => ({
    id: payment.id,
    debtor_id: payment.debtor_id,
    debtor_external_id: payment.debtor.external_id,
    debtor_name: `${payment.debtor.first_name} ${payment.debtor.last_name}`,
    debitor_total_debt: payment.debtor.total_debt.toNumber(),
    amount: payment.amount.toNumber(),
    payment_type: payment.payment_type,
    note: payment.note,
    created_at: payment.created_at.toISOString(),
    created_by: payment.created_by,
    debitor_is_overdue: payment.debtor.is_overdue,
  }));

  const debtsData = debts.map((debt) => ({
    id: debt.id,
    debtor_id: debt.debtor_id,
    debtor_external_id: debt.debtor.external_id,
    debtor_name: `${debt.debtor.first_name} ${debt.debtor.last_name}`,
    debitor_total_debt: debt.debtor.total_debt.toNumber(),
    debitor_is_overdue: debt.debtor.is_overdue,
    amount: debt.amount.toNumber(),
    description: debt.description,
    created_at: debt.created_at.toISOString(),
  }));

  // Totals for summary cards
  const totalPaymentsAmount = payments.reduce((sum, p) => sum + p.amount.toNumber(), 0);
  const totalPaymentsCount = payments.length;
  const totalDebtsAmount = debts.reduce((sum, d) => sum + d.amount.toNumber(), 0);
  const totalDebtsCount = debts.length;
*/

  return (
    <div className="space-y-6">
      <Tabs defaultValue="payments">
        <TabsList className="h-12">
          <TabsTrigger value="payments">
            <div className="w-full md:w-44">
              <h1 className="text-xl font-bold tracking-tight">Qarz va to&apos;lovlar</h1>
            </div>
          </TabsTrigger>

          <TabsTrigger value="summary" disabled>
            <div className="w-full md:w-44">
              <h1 className="text-xl font-bold tracking-tight">Hisobotlar</h1>
            </div>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="payments">
          <p className="text-muted-foreground pb-4 pl-2">Vaqt boyicha qarz va to&apos;lovlar ro&apos;yxati</p>
          <CashClient payments={report.paymentsData} debts={report.debtsData} debtLimit={debtLimit} />
        </TabsContent>
        {/* <TabsContent value="summary">
          <ReportsSummarySection
            totalDebtsAmount={report.totalDebtsAmount}
            totalDebtsCount={report.totalDebtsCount}
            totalPaymentsAmount={report.totalPaymentsAmount}
            totalPaymentsCount={report.totalPaymentsCount}
            totalDebtors={report.totalDebtors}
            highRiskCount={report.highRiskCount}
            mediumRiskCount={report.mediumRiskCount}
            lowRiskCount={report.lowRiskCount}
            overdueCount={report.overdueCount}
            debtLimit={report.debtLimit}
            trends={report.trends}
          />
        </TabsContent> */}
      </Tabs>
    </div>
  );
}
