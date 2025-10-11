import { prisma } from "@/lib/prisma";
import { DebtorsTable } from "./_components/debtors-table";
import { Prisma } from "@prisma/client";
import { DebtItem } from "@/types/types";

export default async function DebtorsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const limit = Number(params.limit) || 10;
  const search = (params.search as string) || "";
  const sortBy = (params.sortBy as string) || "created_at";
  const sortOrder = (params.sortOrder === "asc" ? "asc" : "desc") as Prisma.SortOrder;
  const status = (params.status as string) || "all";

  // Get debt limit from settings
  const debtLimitSetting = await prisma.settings.findUnique({
    where: { key: "debt_limit" },
  });
  const debtLimit = debtLimitSetting ? parseFloat(debtLimitSetting.value) : 2000000;

  // Build where clause
  const where: Prisma.DebtorWhereInput = {};

  if (search) {
    where.OR = [
      { first_name: { contains: search, mode: "insensitive" } },
      { last_name: { contains: search, mode: "insensitive" } },
      { phone_number: { contains: search, mode: "insensitive" } },
    ];
  }

  // Status filter
  if (status === "qarzdor") {
    where.total_debt = { gt: 0, lte: debtLimit };
  } else if (status === "limitdan_oshgan") {
    where.total_debt = { gt: debtLimit };
  } else if (status === "tolangan") {
    where.total_debt = { lte: 0 };
  }

  // Get total count
  const totalCount = await prisma.debtor.count({ where });

  // Build orderBy
  const orderBy: Prisma.DebtorOrderByWithRelationInput = {};
  if (sortBy === "name") {
    orderBy.first_name = sortOrder;
  } else if (sortBy === "amount") {
    orderBy.total_debt = sortOrder;
  } else {
    orderBy[sortBy as keyof Prisma.DebtorOrderByWithRelationInput] = sortOrder;
  }

  // Fetch debtors
  const debtorsRaw = await prisma.debtor.findMany({
    where,
    orderBy,
    skip: (page - 1) * limit,
    take: limit,
    include: {
      debts: true,
      payments: true,
    },
  });

  // Convert Decimal to number and cast JSON types
  const debtors = debtorsRaw.map((debtor) => ({
    ...debtor,
    total_debt: debtor.total_debt.toNumber(),
    debts: debtor.debts.map((debt) => ({
      ...debt,
      amount: debt.amount.toNumber(),
      items: debt.items as DebtItem[] | null,
    })),
    payments: debtor.payments.map((payment) => ({
      ...payment,
      amount: payment.amount.toNumber(),
    })),
  }));

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Qarzdorlar</h1>
          <p className="text-muted-foreground">Jami {totalCount} ta qarzdor</p>
        </div>
      </div>

      <DebtorsTable debtors={debtors} totalPages={totalPages} currentPage={page} debtLimit={debtLimit} />
    </div>
  );
}
