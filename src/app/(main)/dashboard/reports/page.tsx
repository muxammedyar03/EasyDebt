import { getSession } from "@/lib/auth";
import { requireClientId } from "@/lib/tenant";
import { redirect } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getTranslations } from "next-intl/server";
import { reportsService } from "@/lib/services/reports.service";
import CashClient from "./_components/cash-client";
import { debtService } from "@/lib/services/debt.service";

export default async function ReportsPage() {
  const session = await getSession();
  if (!session) redirect("/auth/login");
  const clientId = requireClientId(session);
  const t = await getTranslations("reports");
  const [report, debtLimit] = await Promise.all([
    reportsService.getDashboardReport(clientId),
    debtService.debtLimit(clientId),
  ]);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="payments">
        <TabsList className="h-12">
          <TabsTrigger value="payments">
            <div className="w-full md:w-44">
              <h1 className="text-xl font-bold tracking-tight">{t("debtsAndPayments")}</h1>
            </div>
          </TabsTrigger>

          <TabsTrigger value="summary" disabled>
            <div className="w-full md:w-44">
              <h1 className="text-xl font-bold tracking-tight">{t("reportsTab")}</h1>
            </div>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="payments">
          <p className="text-muted-foreground pb-4 pl-2">{t("debtsPaymentsList")}</p>
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
