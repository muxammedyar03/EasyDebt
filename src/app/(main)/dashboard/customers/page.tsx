import { debtorService } from "@/lib/services/debtor.service";
import { CustomersTableWrap } from "./_components/customers-table-wrap";
import { t } from "@/lib/i18n";

export default async function CustomersPage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
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

  // Get customer ratings from service with filtering and pagination
  const result = await debtorService.getCustomerRatings(
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

  // Get total debtors count
  const totalDebtorsCount = await debtorService.debtorsCount();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("customers.title")}</h1>
        <p className="text-muted-foreground">{t("customers.subtitle")}</p>
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
