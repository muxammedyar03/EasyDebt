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
