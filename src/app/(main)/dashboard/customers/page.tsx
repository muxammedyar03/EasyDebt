import { prisma } from "@/lib/prisma";
import { CustomersTable } from "./_components/customers-table";
import { Debtor, Payment } from "@prisma/client";
import { Debt, PaymentType as LocalPaymentType } from "@/types/types";

interface SearchParams {
  page?: string;
  search?: string;
  rating?: string;
}

export default async function CustomersPage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const searchParams = await searchParamsPromise;
  const page = parseInt(searchParams.page || "1");
  const search = searchParams.search || "";
  const rating = searchParams.rating || "all";
  const pageSize = 20;

  // Get all debts and payments from last 3 months
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const debtsRaw = await prisma.debt.findMany({
    where: {
      created_at: {
        gte: threeMonthsAgo,
      },
    },
    include: {
      debtor: true,
    },
    orderBy: {
      created_at: "asc",
    },
  });

  const paymentsRaw = await prisma.payment.findMany({
    where: {
      created_at: {
        gte: threeMonthsAgo,
      },
    },
    include: {
      debtor: true,
    },
    orderBy: {
      created_at: "asc",
    },
  });

  // Helper: parse JSON items returned as JsonValue (string or object)
  const parseItems = (items: unknown) => {
    if (items == null) return null;
    if (typeof items === "string") {
      try {
        return JSON.parse(items);
      } catch {
        return null;
      }
    }
    return items;
  };

  // Local DTO types (avoid any[])
  type DebtorDTO = Omit<Debtor, "total_debt"> & { total_debt: number };
  type DebtDTO = Omit<Debt, "amount" | "debtor" | "items"> & {
    amount: number;
    debtor: DebtorDTO;
    items: Debt["items"] | null;
  };
  type PaymentDTO = Omit<Payment, "amount" | "debtor" | "payment_type"> & {
    amount: number;
    debtor: DebtorDTO;
    payment_type: LocalPaymentType;
  };

  // Convert Decimal -> number and ensure items is parsed
  const debts = debtsRaw.map(
    (debt): DebtDTO => ({
      ...debt,
      amount: debt.amount.toNumber(),
      items: parseItems(debt.items),
      debtor: {
        ...debt.debtor,
        total_debt: debt.debtor.total_debt.toNumber(),
      },
    }),
  );

  const payments = paymentsRaw.map(
    (payment): PaymentDTO => ({
      ...payment,
      amount: payment.amount.toNumber(),
      // Map Prisma enum -> local PaymentType (both are string enums, so cast is safe)
      payment_type: payment.payment_type as unknown as LocalPaymentType,
      debtor: {
        ...payment.debtor,
        total_debt: payment.debtor.total_debt.toNumber(),
      },
    }),
  );

  // Calculate customer ratings based on debt → payment time
  const customerRatings = new Map<
    number,
    {
      debtorId: number;
      debtor: DebtorDTO;
      payments: PaymentDTO[];
      validPayments: number;
      avgDaysBetweenPayments: number;
      avgDaysBetweenDebtAndPayment: number;
      rating: "good" | "average" | "bad";
    }
  >();

  // Group debts and payments by debtor (use typed DTO arrays)
  const debtsByDebtor = new Map<number, DebtDTO[]>();
  const paymentsByDebtor = new Map<number, PaymentDTO[]>();

  debts.forEach((debt) => {
    const existing = debtsByDebtor.get(debt.debtor_id) || [];
    existing.push(debt);
    debtsByDebtor.set(debt.debtor_id, existing);
  });

  payments.forEach((payment) => {
    const existing = paymentsByDebtor.get(payment.debtor_id) || [];
    existing.push(payment);
    paymentsByDebtor.set(payment.debtor_id, existing);
  });

  // Minimum payment percentage (30-40% of debt)
  const MIN_PAYMENT_PERCENT = 0.3; // 30%

  // Calculate average days from debt to payment for each debtor
  debtsByDebtor.forEach((debtorDebts, debtorId) => {
    const debtorPayments = paymentsByDebtor.get(debtorId) || [];

    if (debtorPayments.length === 0) return; // No payments yet

    let totalDays = 0;
    let validPaymentsCount = 0;
    const usedDebts = new Set<number>(); // Track which debts have been paid

    // For each debt, find payments that cover at least 30% of it
    debtorDebts.forEach((debt) => {
      const debtAmount = debt.amount;
      const minPaymentAmount = debtAmount * MIN_PAYMENT_PERCENT;

      // Find payments after this debt
      const eligiblePayments = debtorPayments.filter(
        (payment) => payment.created_at >= debt.created_at && payment.amount >= minPaymentAmount,
      );

      if (eligiblePayments.length > 0) {
        // Get the first payment that covers at least 30% of the debt
        const firstValidPayment = eligiblePayments[0];

        // Calculate days between debt and payment
        const days = Math.floor(
          (firstValidPayment.created_at.getTime() - debt.created_at.getTime()) / (1000 * 60 * 60 * 24),
        );

        totalDays += days;
        validPaymentsCount++;
        usedDebts.add(debt.id);
      }
    });

    if (validPaymentsCount === 0) return; // No valid debt-payment pairs

    const avgDays = totalDays / validPaymentsCount;

    // Determine rating
    let rating: "good" | "average" | "bad";
    if (avgDays <= 45) {
      rating = "good";
    } else if (avgDays <= 55) {
      rating = "average";
    } else {
      rating = "bad";
    }

    customerRatings.set(debtorId, {
      debtorId,
      debtor: debtorDebts[0].debtor,
      payments: debtorPayments,
      validPayments: validPaymentsCount,
      avgDaysBetweenPayments: avgDays, // For backward compatibility
      avgDaysBetweenDebtAndPayment: avgDays,
      rating,
    });
  });

  // Convert to array and filter by rating
  let customers = Array.from(customerRatings.values());

  if (rating !== "all") {
    customers = customers.filter((c) => c.rating === rating);
  }

  // Filter by search
  if (search) {
    const lowerSearch = search.toLowerCase();
    customers = customers.filter(
      (c) =>
        c.debtor.first_name.toLowerCase().includes(lowerSearch) ||
        c.debtor.last_name.toLowerCase().includes(lowerSearch) ||
        c.debtor.phone_number?.toLowerCase().includes(lowerSearch),
    );
  }

  // Pagination
  const totalCustomers = customers.length;
  const totalPages = Math.ceil(totalCustomers / pageSize);
  const paginatedCustomers = customers.slice((page - 1) * pageSize, page * pageSize);

  // Count by rating
  const allCustomers = Array.from(customerRatings.values());
  const goodCount = allCustomers.filter((c) => c.rating === "good").length;
  const averageCount = allCustomers.filter((c) => c.rating === "average").length;
  const badCount = allCustomers.filter((c) => c.rating === "bad").length;

  const transformedCustomers = paginatedCustomers.map((customer) => ({
    ...customer,
    payments: customer.payments.map((payment) => ({
      ...payment,
      debtor: {
        ...payment.debtor,
        is_overdue: false,
      },
    })),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mijozlar Reytingi</h1>
        <p className="text-muted-foreground">Oxirgi 3 oy ichidagi to&apos;lov tarixi asosida</p>
      </div>

      <CustomersTable
        customers={transformedCustomers}
        currentPage={page}
        totalPages={totalPages}
        goodCount={goodCount}
        averageCount={averageCount}
        badCount={badCount}
      />
    </div>
  );
}
