import { companyDailySnapshotService } from "@/lib/services/company-daily-snapshot.service";
import { getQuickRanges } from "@/lib/companies/period-ranges";
import { CompanyDebtsReportClient } from "./_components/company-debts-report-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CompanyDebtsReportPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const quick = getQuickRanges().thisMonth;
  const dateFromStr = (params.dateFrom as string) || quick.dateFrom;
  const dateToStr = (params.dateTo as string) || quick.dateTo;
  const search = (params.search as string) || "";

  const dateFrom = new Date(dateFromStr);
  const dateTo = new Date(dateToStr);

  const report = await companyDailySnapshotService.getPeriodReport(
    Number.isNaN(dateFrom.getTime()) ? new Date(quick.dateFrom) : dateFrom,
    Number.isNaN(dateTo.getTime()) ? new Date(quick.dateTo) : dateTo,
  );

  return (
    <CompanyDebtsReportClient
      initialReport={report}
      initialDateFrom={dateFromStr}
      initialDateTo={dateToStr}
      initialSearch={search}
    />
  );
}
