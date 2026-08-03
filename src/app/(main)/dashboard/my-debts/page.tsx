import { BadgeDollarSign, Building2, HandCoinsIcon } from "lucide-react";

import { SectionCard } from "../_components/section-card";
import { companyService } from "@/lib/services/company.service";
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
    companyService.getStats(),
  ]);

  const companies = result.data.map(domainToViewCompany);

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div>
        <h1 className="text-2xl font-bold">Mening qarzlarim</h1>
        <p className="text-muted-foreground text-sm">Yetkazib beruvchi kompaniyalarga qarzlar boshqaruvi</p>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 lg:gap-4">
        <SectionCard
          title="Kompaniyalar"
          count={stats.totalCompanies}
          color="text-indigo-600"
          icon={<Building2 className="!size-4" />}
        />
        <SectionCard
          title="Jami qarz"
          defaultVisible
          amount={stats.totalDebt}
          icon={<BadgeDollarSign className="!h-4 !w-4" />}
        />
        <SectionCard
          title="Jami to'lovlar"
          defaultVisible
          color="text-green-600"
          amount={stats.totalPaymentsAmount}
          icon={<HandCoinsIcon className="!h-4 !w-4" />}
        />
        <SectionCard
          title="Bugungi harakat"
          defaultVisible
          amount={stats.todayDebtsAmount + stats.todayPaymentsAmount}
          description={`Qarz: ${stats.todayDebtsCount} · To'lov: ${stats.todayPaymentsCount}`}
          icon={<HandCoinsIcon className="!h-4 !w-4" />}
        />
      </div>

      <CompaniesClient companies={companies} currentPage={result.page} totalPages={result.totalPages} />
    </div>
  );
}
