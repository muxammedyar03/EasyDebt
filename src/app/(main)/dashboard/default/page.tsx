import { ChartAreaInteractive } from "./_components/chart-area-interactive";
import { DataTable } from "./_components/data-table";
import { SectionCards } from "./_components/section-cards";
import { debtorService } from "@/lib/services/debtor.service";
import { debtService } from "@/lib/services/debt.service";
import { paymentService } from "@/lib/services/payment.service";
import { paymentReminderService } from "@/lib/services/payment-reminder.service";
import { domainToViewDebtor } from "@/lib/mappers";

// Ensure this page is always rendered dynamically so changes to is_overdue are reflected immediately
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Page() {
  // Fetch ALL debtors for the dashboard table (client-side search/pagination)
  const [debtorsRaw, stats, debtLimit, chartData, remindersMap] = await Promise.all([
    debtorService.findMany(undefined, { page: 1, limit: 10000 }), // Barcha debtorlar
    debtorService.getStats(),
    debtService.debtLimit(),
    paymentService.getPaymentsChartData(),
    paymentReminderService.getActiveRemindersByDebtor(),
  ]);

  // Convert DebtorDomain[] to DebtorView[] and add reminder info
  const debtorViews = debtorsRaw.data.map((debtor) => {
    const view = domainToViewDebtor(debtor);
    const reminder = remindersMap.get(debtor.id);
    if (reminder) {
      view.nextReminder = {
        id: reminder.id,
        reminderAt: reminder.reminderAt,
        status: reminder.status as "PENDING" | "NOTIFIED",
        note: reminder.note,
      };
    }
    return view;
  });

  return (
    <div className="@container/main flex flex-col gap-4 bg-red-500 md:gap-6">
      <DataTable data={debtorViews} debtLimit={debtLimit} />

      {/* Statistics Cards */}
      <SectionCards stats={stats} />

      {/* Chart */}
      <ChartAreaInteractive chartData={chartData} />
    </div>
  );
}
