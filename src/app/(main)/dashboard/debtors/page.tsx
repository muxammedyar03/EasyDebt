import { DebtorsTable } from "./_components/debtors-table";
import { SectionCard } from "../_components/section-card";
import { BadgeDollarSign, HandCoinsIcon, Users } from "lucide-react";
import { debtorService } from "@/lib/services/debtor.service";
import { domainToViewDebtor } from "@/lib/mappers";
import { debtService } from "@/lib/services/debt.service";
import { parseDebtorsSearchParams } from "@/lib/debtors/debtors-list-filters";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DebtorsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const debtLimit = await debtService.debtLimit();
  const { pagination, filters, listOptions } = parseDebtorsSearchParams(params, debtLimit);

  const [debtorsFromService, aggregates] = await Promise.all([
    debtorService.findMany(filters, pagination, listOptions),
    debtorService.getFilteredAggregates(filters, listOptions),
  ]);

  const debtorViews = debtorsFromService.data.map((debtor) => domainToViewDebtor(debtor));

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("debtors.title")}</h1>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 lg:gap-6 2xl:grid-cols-4">
        <SectionCard
          title={t("debtorsPage.totalDebtors")}
          count={debtorsFromService.total}
          color="text-indigo-600"
          icon={<Users className="!size-4" />}
        />
        <SectionCard
          title={t("debtorsPage.totalDebt")}
          defaultVisible
          amount={aggregates.totalDebt}
          icon={<BadgeDollarSign className="!h-4 !w-4" />}
        />
        <SectionCard
          title={t("debtorsPage.totalPayments")}
          defaultVisible
          color="text-green-600"
          amount={aggregates.totalPayments}
          icon={<HandCoinsIcon className="!h-4 !w-4" />}
        />
      </div>

      <DebtorsTable
        debtors={debtorViews}
        totalPages={debtorsFromService.totalPages}
        currentPage={debtorsFromService.page}
        debtLimit={debtLimit}
      />
    </div>
  );
}
