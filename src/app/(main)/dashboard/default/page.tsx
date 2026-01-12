import { prisma } from "@/lib/prisma";

import { ChartAreaInteractive } from "./_components/chart-area-interactive";
import { DataTable } from "./_components/data-table";
import { SectionCards } from "./_components/section-cards";
import { debtorService } from "@/lib/services/debtor.service";
import { debtorSchema } from "./_components/schema";
import { debtService } from "@/lib/services/debt.service";
import { paymentService } from "@/lib/services/payment.service";

// Ensure this page is always rendered dynamically so changes to is_overdue are reflected immediately
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Page() {
  // Fetch raw debtors for the dashboard table (shape must match debtorSchema)
  const [debtorsRaw, stats, debtLimit, chartData] = await Promise.all([
    prisma.debtor.findMany({
      orderBy: { created_at: "desc" },
    }),
    debtorService.getStats(),
    debtService.debtLimit(),
    paymentService.getPaymentsChartData(),
  ]);

  // Normalize Decimal -> number for total_debt to satisfy schema
  const debtors = debtorsRaw.map((debtor) => ({
    ...debtor,
    total_debt: debtor.total_debt.toNumber(),
  }));

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <DataTable data={debtors.map((debtor) => debtorSchema.parse(debtor))} debtLimit={debtLimit} />

      {/* Statistics Cards */}
      <SectionCards stats={stats} />

      {/* Chart */}
      <ChartAreaInteractive chartData={chartData} />
    </div>
  );
}
