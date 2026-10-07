import { hasPermission } from "@/lib/security/permission-access";
import { ChartAreaInteractive } from "./_components/chart-area-interactive";
import { DataTable } from "./_components/data-table";
import { SectionCards } from "./_components/section-cards";
import { debtorService } from "@/lib/services/debtor.service";
import { debtService } from "@/lib/services/debt.service";
import { paymentService } from "@/lib/services/payment.service";
import { paymentReminderService } from "@/lib/services/payment-reminder.service";
import { domainToViewDebtor } from "@/lib/mappers";
import { getSession } from "@/lib/auth";
import { requireClientId } from "@/lib/tenant";
import { redirect } from "next/navigation";
import { RecentActions } from "./_components/recent-actions";

// Ensure this page is always rendered dynamically so changes to is_overdue are reflected immediately
export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Initial debtor list size for dashboard default; full list with server pagination at /dashboard/debtors (Task 4.1a). */
const DASHBOARD_DEFAULT_DEBTOR_LIMIT = 100;

export default async function Page() {
  const session = await getSession();
  if (!session) redirect("/auth/login");
  if (!(await hasPermission(session, "dashboard.view"))) redirect("/unauthorized");
  const clientId = requireClientId(session);
  const canViewAudit = await hasPermission(session, "audit.view");
  const canUndoAudit = canViewAudit && (await hasPermission(session, "audit.undo"));
  const canCancelAudit = canViewAudit && (await hasPermission(session, "audit.cancel"));

  const [debtorsRaw, stats, debtLimit, chartData, remindersMap] = await Promise.all([
    debtorService.findMany(clientId, undefined, { page: 1, limit: DASHBOARD_DEFAULT_DEBTOR_LIMIT }),
    debtorService.getStats(clientId),
    debtService.debtLimit(clientId),
    paymentService.getPaymentsChartData(clientId),
    paymentReminderService.getActiveRemindersByDebtor(clientId),
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
    <div className={canViewAudit ? "grid gap-6 2xl:grid-cols-[minmax(0,1fr)_440px]" : ""}>
      <div className="@container/main flex min-w-0 flex-col gap-4 md:gap-6">
        <DataTable data={debtorViews} debtLimit={debtLimit} />

        {/* Statistics Cards */}
        <SectionCards stats={stats} />

        {/* Chart */}
        <ChartAreaInteractive chartData={chartData} />
      </div>
      {canViewAudit && (
        <aside className="hidden 2xl:block">
          <RecentActions
            clientId={clientId}
            canUndo={canUndoAudit}
            canCancel={canCancelAudit}
            actorRole={session.role}
          />
        </aside>
      )}
    </div>
  );
}
