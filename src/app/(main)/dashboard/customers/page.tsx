import { hasPermission } from "@/lib/security/permission-access";
import { debtorService } from "@/lib/services/debtor.service";
import { getSession } from "@/lib/auth";
import { requireClientId } from "@/lib/tenant";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CustomersTableWrap } from "./_components/customers-table-wrap";

export default async function CustomersPage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  if (!session) redirect("/auth/login");
  if (!(await hasPermission(session, "customers.view"))) redirect("/unauthorized");
  const clientId = requireClientId(session);

  const t = await getTranslations("customers");
  const searchParams = (props.searchParams ? await props.searchParams : {}) as Record<
    string,
    string | string[] | undefined
  >;

  const rawPage = Array.isArray(searchParams.page) ? searchParams.page[0] : searchParams.page;
  const rawSearch = Array.isArray(searchParams.search) ? searchParams.search[0] : searchParams.search;
  const rawRating = Array.isArray(searchParams.rating) ? searchParams.rating[0] : searchParams.rating;
  const rawSortField = Array.isArray(searchParams.sortField)
    ? searchParams.sortField[0]
    : (searchParams.sortField as string | undefined);
  const rawSortOrder = Array.isArray(searchParams.sortOrder)
    ? searchParams.sortOrder[0]
    : (searchParams.sortOrder as string | undefined);

  const page = parseInt(rawPage || "1");
  const search = rawSearch || "";
  const rating = (rawRating || "all") as "all" | "high" | "medium" | "critical";
  const pageSize = 20;
  const sortField = (rawSortField || "date") as "date" | "name" | "days" | "payments" | "debt";
  const sortOrder = (rawSortOrder === "asc" || rawSortOrder === "desc" ? rawSortOrder : "desc") as "asc" | "desc";

  const result = await debtorService.getCustomerRatings(
    clientId,
    {
      search: search || undefined,
      rating: rating === "all" ? undefined : rating,
    },
    {
      page,
      sortBy: sortField,
      sortOrder: sortOrder,
      limit: pageSize,
    },
  );

  const { data: customerRatings, counts, total: totalCustomers } = result;
  const totalDebtorsCount = await debtorService.debtorsCount(clientId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      <CustomersTableWrap
        initialCustomers={customerRatings}
        initialCurrentPage={page}
        initialTotalPages={Math.ceil(totalCustomers / pageSize)}
        totalDebtorsCount={totalDebtorsCount}
        goodCount={counts.high}
        averageCount={counts.medium}
        badCount={counts.critical}
      />
    </div>
  );
}
