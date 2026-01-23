import { ChartAreaInteractive } from "./_components/chart-area-interactive";
import { DataTable } from "./_components/data-table";
import { SectionCards } from "./_components/section-cards";
import { debtorService } from "@/lib/services/debtor.service";
import { debtService } from "@/lib/services/debt.service";
import { paymentService } from "@/lib/services/payment.service";
import { domainToViewDebtor } from "@/lib/mappers";

// Ensure this page is always rendered dynamically so changes to is_overdue are reflected immediately
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Page() {
  // Fetch raw debtors for the dashboard table (shape must match debtorSchema)
  const [debtorsRaw, stats, debtLimit, chartData] = await Promise.all([
    debtorService.findMany(),
    debtorService.getStats(),
    debtService.debtLimit(),
    paymentService.getPaymentsChartData(),
  ]);

  // Convert DebtorDomain[] to DebtorView[]
  const debtorViews = debtorsRaw.data.map((debtor) => domainToViewDebtor(debtor));

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <DataTable data={debtorViews} debtLimit={debtLimit} />

      {/* Statistics Cards */}
      <SectionCards stats={stats} />

      {/* Chart */}
      <ChartAreaInteractive chartData={chartData} />
    </div>
  );
}
