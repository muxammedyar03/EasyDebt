import { CompanyDebtsReportClient } from "./_components/company-debts-report-client";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/security/permission-access";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CompanyDebtsReportPage() {
  if (!(await hasPermission(await getSession(), "company-reports.view"))) redirect("/unauthorized");
  return <CompanyDebtsReportClient />;
}
