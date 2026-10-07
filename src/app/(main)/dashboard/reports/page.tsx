import { hasPermission } from "@/lib/security/permission-access";
import { getSession } from "@/lib/auth";
import { requireClientId } from "@/lib/tenant";
import { redirect, notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { reportsService } from "@/lib/services/reports.service";
import { parseReportQuery } from "@/lib/report-query";
import CashClient from "./_components/cash-client";
import { debtService } from "@/lib/services/debt.service";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  if (!session) redirect("/auth/login");
  if (!(await hasPermission(session, "reports.view"))) redirect("/unauthorized");
  const clientId = requireClientId(session);
  let query;
  try {
    query = parseReportQuery(await searchParams);
  } catch {
    notFound();
  }
  const t = await getTranslations("reports");
  const [report, debtLimit] = await Promise.all([
    reportsService.getDashboardReport(clientId, query),
    debtService.debtLimit(clientId),
  ]);

  return (
    <div>
      <h1 className="text-xl font-bold tracking-tight">{t("debtsAndPayments")}</h1>
      <p className="text-muted-foreground pb-4">{t("debtsPaymentsList")}</p>
      <CashClient report={report} debtLimit={debtLimit} />
      {/* <Tabs defaultValue="payments"> */}
      {/* <TabsList className="h-12">
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
        </TabsList> */}
      {/* <TabsContent value="payments">
        </TabsContent>
      </Tabs> */}
    </div>
  );
}
