import { hasPermission } from "@/lib/security/permission-access";
import { DebtorsTable } from "./_components/debtors-table";
import { SectionCard } from "../_components/section-card";
import { BadgeDollarSign, HandCoinsIcon, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { debtorService } from "@/lib/services/debtor.service";
import { domainToViewDebtor } from "@/lib/mappers";
import type { DebtorDomainFilters, DebtorStatus } from "@/types/domain/debtor.domain";
import type { DebtorView } from "@/types/view";
import { debtService } from "@/lib/services/debt.service";
import { getSession } from "@/lib/auth";
import { requireClientId } from "@/lib/tenant";
import { redirect } from "next/navigation";

// Ensure this page is always dynamic and not cached
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DebtorsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const t = await getTranslations("debtorsPage");
  const session = await getSession();
  if (!session) redirect("/auth/login");
  if (!(await hasPermission(session, "debtors.view"))) redirect("/unauthorized");
  const clientId = requireClientId(session);
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const limit = Number(params.limit) || 10;
  const search = (params.search as string) || "";
  const sortBy = (params.sortBy as string) || "created_at";
  const sortOrder = (params.sortOrder === "asc" ? "asc" : "desc") as "asc" | "desc";
  const status = (params.status as string) || "all";
  const debtLimit = await debtService.debtLimit(clientId);

  let domainStatus: DebtorStatus | undefined;
  switch (status) {
    case "tolangan":
      domainStatus = "paid_off";
      break;
    case "qarzdor":
      domainStatus = "inactive";
      break;
  }

  const filters: DebtorDomainFilters = {
    search,
    status: domainStatus,
    riskStatus: undefined,
    isOverdue: status === "muddati_otgan" ? true : undefined,
    minDebt: status === "qarzdor" ? 1 : status === "limitdan_oshgan" ? debtLimit : undefined,
    maxDebt: status === "qarzdor" ? debtLimit - 1 : undefined,
    createdBy: undefined,
  };

  const debtorsFromService = await debtorService.findMany(clientId, filters, { page, limit, sortBy, sortOrder });

  const debtorViews: DebtorView[] = debtorsFromService.data.map((debtor) => domainToViewDebtor(debtor));
  const totalDebt = await debtorService.debtorsTotalDebt(clientId);
  const totalPayments = await debtorService.debtorsTotalPayments(clientId);

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 lg:gap-6 2xl:grid-cols-4">
        <SectionCard
          title={t("totalDebtors")}
          count={debtorsFromService.total}
          color="text-indigo-600"
          icon={<Users className="!size-4" />}
        />
        <SectionCard
          title={t("totalDebt")}
          defaultVisible
          amount={totalDebt}
          icon={<BadgeDollarSign className="!h-4 !w-4" />}
        />
        <SectionCard
          title={t("totalPayments")}
          defaultVisible
          color="text-green-600"
          amount={totalPayments}
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

