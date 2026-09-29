import { hasPermission } from "@/lib/security/permission-access";
import { BadgeDollarSign, Building2, HandCoinsIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { SectionCard } from "../_components/section-card";
import { companyService } from "@/lib/services/company.service";
import { getSession } from "@/lib/auth";
import { requireClientId } from "@/lib/tenant";
import { redirect } from "next/navigation";
import { domainToViewCompany } from "@/lib/mappers/company.mapper";
import type { CompanyFilterStatus, CompanySortBy } from "@/types/domain/company.domain";
import { CompaniesClient } from "./_components/companies-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MyDebtsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getSession();
  if (!session) redirect("/auth/login");
  if (!(await hasPermission(session, "companies.view"))) redirect("/unauthorized");
  const clientId = requireClientId(session);
  const t = await getTranslations("myDebts");
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const limit = Number(params.limit) || 10;
  const search = (params.search as string) || "";
  const sortBy = ((params.sortBy as string) || "name") as CompanySortBy;
  const sortOrder = (params.sortOrder === "asc" ? "asc" : "desc") as "asc" | "desc";
  const status = ((params.status as string) || "all") as CompanyFilterStatus;
  const dateFrom = params.dateFrom ? new Date(String(params.dateFrom)) : undefined;
  const dateTo = params.dateTo ? new Date(String(params.dateTo)) : undefined;
  const minAmount = params.minAmount ? Number(params.minAmount) : undefined;
  const maxAmount = params.maxAmount ? Number(params.maxAmount) : undefined;

  const [result, stats] = await Promise.all([
    companyService.findMany(
      clientId,
      {
        search,
        status,
        dateFrom: dateFrom && !Number.isNaN(dateFrom.getTime()) ? dateFrom : undefined,
        dateTo: dateTo && !Number.isNaN(dateTo.getTime()) ? dateTo : undefined,
        minDebt: Number.isFinite(minAmount) ? minAmount : undefined,
        maxDebt: Number.isFinite(maxAmount) ? maxAmount : undefined,
      },
      { page, limit, sortBy, sortOrder },
    ),
    companyService.getStats(clientId),
  ]);

  const companies = result.data.map(domainToViewCompany);

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 lg:gap-4">
        <SectionCard
          title={t("companies")}
          count={stats.totalCompanies}
          color="text-indigo-600"
          icon={<Building2 className="!size-4" />}
        />
        <SectionCard
          title={t("totalDebt")}
          defaultVisible
          amount={stats.totalDebt}
          icon={<BadgeDollarSign className="!h-4 !w-4" />}
        />
        <SectionCard
          title={t("totalPayments")}
          defaultVisible
          color="text-green-600"
          amount={stats.totalPaymentsAmount}
          icon={<HandCoinsIcon className="!h-4 !w-4" />}
        />
        <SectionCard
          title={t("todayActivity")}
          defaultVisible
          amount={stats.todayDebtsAmount + stats.todayPaymentsAmount}
          description={t("todayActivityDesc", {
            debts: stats.todayDebtsCount,
            payments: stats.todayPaymentsCount,
          })}
          icon={<HandCoinsIcon className="!h-4 !w-4" />}
        />
      </div>

      <CompaniesClient companies={companies} currentPage={result.page} totalPages={result.totalPages} />
    </div>
  );
}

