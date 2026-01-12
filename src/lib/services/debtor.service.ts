/**
 * SERVICE LAYER - Business Logic + Data Access
 *
 * Rules:
 * - Prisma queries ONLY in this layer (and API routes for simple cases)
 * - Returns Domain types, NEVER Prisma types
 * - Handles business logic (calculations, validations)
 * - Uses mappers to convert Prisma → Domain
 * - Components/Pages receive Domain or View types
 */

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type {
  DebtorDomain,
  CreateDebtorDomainInput,
  UpdateDebtorDomainInput,
  DebtorDomainFilters,
  PaginationOptions,
  PaginatedResult,
  DebtorStats,
} from "@/types/domain/debtor.domain";
import type {
  CustomerRatingDomain,
  CustomerRatingFilters,
  PaginatedCustomerRatingsView,
} from "@/types/domain/customer-rating.domain";
import {
  prismaToDomainDebtor,
  domainToTableViewDebtor,
  domainToDetailViewDebtor,
  customerRatingDomainToTableProps,
} from "@/lib/mappers/debtor.mapper";
import type { DebtorTableView, DebtorDetailView } from "@/types/view/debtor.view";
import { PaymentDomain } from "@/types/domain";

/**
 * Service class for Debtor operations
 *
 * This is the ONLY place where Prisma is queried for debtors.
 * All other parts of the app use this service.
 */
export class DebtorService {
  /**
   * Get settings needed for domain calculations
   */
  private async getSettings() {
    const [debtLimitSetting, overdueDaysSetting] = await Promise.all([
      prisma.settings.findUnique({ where: { key: "debt_limit" } }),
      prisma.settings.findUnique({ where: { key: "overdue_days" } }),
    ]);

    return {
      debtLimit: debtLimitSetting ? parseFloat(debtLimitSetting.value) : 2000000,
      overdueDays: overdueDaysSetting ? parseInt(overdueDaysSetting.value, 10) : 45,
    };
  }

  /**
   * Find debtor by ID (returns Domain type)
   */
  async findById(id: number, includeRelations = false): Promise<DebtorDomain | null> {
    const settings = await this.getSettings();

    const debtor = await prisma.debtor.findUnique({
      where: { id },
      include: {
        debts: includeRelations,
        payments: includeRelations,
        creator: includeRelations,
      },
    });

    if (!debtor) return null;

    return prismaToDomainDebtor(debtor, settings);
  }

  /**
   * Find debtors with filters and pagination (returns Domain types)
   */
  async findMany(
    filters?: DebtorDomainFilters,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<DebtorDomain>> {
    const settings = await this.getSettings();

    // Build Prisma where clause from domain filters
    const where = this.buildWhereClause(filters);

    // Build orderBy
    const orderBy = this.buildOrderBy(pagination?.sortBy, pagination?.sortOrder);

    // Get total count
    const total = await prisma.debtor.count({ where });

    // Get paginated results
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 10;
    const skip = (page - 1) * limit;

    const debtors = await prisma.debtor.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        debts: true,
        payments: true,
        creator: true,
      },
    });

    // Convert to domain types
    const domainDebtors = debtors.map((d) => prismaToDomainDebtor(d, settings));

    return {
      data: domainDebtors,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async debtorsCount(): Promise<number> {
    return await prisma.debtor.count();
  }

  async debtorsTotalDebt(): Promise<number> {
    const result = await prisma.debtor.aggregate({
      _sum: { total_debt: true },
    });
    return result._sum.total_debt?.toNumber() ?? 0;
  }

  async debtorsTotalPayments(): Promise<number> {
    const result = await prisma.payment.aggregate({
      _sum: { amount: true },
    });
    return result._sum.amount?.toNumber() ?? 0;
  }

  async debtorsTotalDebts(): Promise<number> {
    const result = await prisma.debt.aggregate({
      _sum: { amount: true },
    });
    return result._sum.amount?.toNumber() ?? 0;
  }

  async todayDebtsCount(): Promise<number> {
    return await prisma.debt.count({
      where: {
        created_at: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lte: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      },
    });
  }

  async todayDebtsAmount(): Promise<number> {
    const result = await prisma.debt.aggregate({
      _sum: { amount: true },
      where: {
        created_at: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lte: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      },
    });
    return result._sum.amount?.toNumber() ?? 0;
  }

  async todayPaymentsCount(): Promise<number> {
    const result = await prisma.payment.count({
      where: {
        created_at: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lte: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      },
    });

    return result;
  }

  async todayPaymentsAmount(): Promise<number> {
    const result = await prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        created_at: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lte: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      },
    });
    return result._sum.amount?.toNumber() ?? 0;
  }

  /**
   * Get stats for debtors
   */
  async getStats(): Promise<DebtorStats> {
    return {
      totalDebtors: await this.debtorsCount(),
      totalDebt: await this.debtorsTotalDebt(),
      totalDebtsCount: await this.todayDebtsCount(),
      todayDebtsAmount: await this.todayDebtsAmount(),
      todayDebtsCount: await this.todayDebtsCount(),
      todayPaymentsCount: await this.todayPaymentsCount(),
      todayPaymentsAmount: await this.todayPaymentsAmount(),
    };
  }

  /**
   * Create a new debtor (returns Domain type)
   */
  async create(input: CreateDebtorDomainInput): Promise<DebtorDomain> {
    const settings = await this.getSettings();

    // Create in database
    const debtor = await prisma.debtor.create({
      data: {
        first_name: input.firstName,
        last_name: input.lastName,
        phone_number: input.phoneNumber,
        address: input.address,
        created_by: input.createdBy,
      },
      include: {
        creator: true,
      },
    });

    return prismaToDomainDebtor(debtor, settings);
  }

  /**
   * Update a debtor (returns Domain type)
   */
  async update(id: number, input: UpdateDebtorDomainInput): Promise<DebtorDomain> {
    const settings = await this.getSettings();

    const debtor = await prisma.debtor.update({
      where: { id },
      data: {
        first_name: input.firstName,
        last_name: input.lastName,
        phone_number: input.phoneNumber,
        address: input.address,
      },
      include: {
        creator: true,
      },
    });

    return prismaToDomainDebtor(debtor, settings);
  }

  /**
   * Delete a debtor
   */
  async delete(id: number): Promise<void> {
    await prisma.debtor.delete({
      where: { id },
    });
  }

  /**
   * Get debtor as View type (for UI)
   */
  async getView(id: number): Promise<DebtorDetailView | null> {
    const domain = await this.findById(id, true);
    if (!domain) return null;
    return domainToDetailViewDebtor(domain);
  }

  /**
   * Get debtors as View types (for UI tables)
   */
  async getTableView(
    filters?: DebtorDomainFilters,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<DebtorTableView>> {
    const result = await this.findMany(filters, pagination);
    return {
      ...result,
      data: result.data.map(domainToTableViewDebtor),
    };
  }

  /**
   * Get customer ratings based on payment history with filtering and pagination
   *
   * Calculates average days from debt to payment for each debtor and assigns ratings
   */
  async getCustomerRatings(
    filters?: CustomerRatingFilters,
    pagination?: PaginationOptions,
  ): Promise<PaginatedCustomerRatingsView> {
    const settings = await this.getSettings();
    const overdueDays = settings.overdueDays;
    const MIN_PAYMENT_PERCENT = 0.5; // Minimum payment percentage to consider valid (50% of debt amount)

    // Get all debts and payments
    const [debtsRaw, paymentsRaw] = await Promise.all([
      prisma.debt.findMany({
        include: { debtor: true },
        orderBy: { created_at: "asc" },
      }),
      prisma.payment.findMany({
        include: { debtor: true },
        orderBy: { created_at: "asc" },
      }),
    ]);

    // Group debts and payments by debtor
    const debtsByDebtor = new Map<number, typeof debtsRaw>();
    const paymentsByDebtor = new Map<number, typeof paymentsRaw>();

    debtsRaw.forEach((debt) => {
      const existing = debtsByDebtor.get(debt.debtor_id) || [];
      existing.push(debt);
      debtsByDebtor.set(debt.debtor_id, existing);
    });

    paymentsRaw.forEach((payment) => {
      const existing = paymentsByDebtor.get(payment.debtor_id) || [];
      existing.push(payment);
      paymentsByDebtor.set(payment.debtor_id, existing);
    });

    // Calculate ratings for each debtor
    const customerRatings = new Map<number, CustomerRatingDomain>();

    debtsByDebtor.forEach((debtorDebts, debtorId) => {
      const debtorPayments = paymentsByDebtor.get(debtorId) || [];

      if (debtorPayments.length === 0) return; // No payments yet

      const debtor = debtorDebts[0].debtor;
      const totalDebt = debtor.total_debt.toNumber();

      // For avgDaysBetweenDebtAndPayment, calculate average days from each debt to its first valid payment
      let totalDays = 0;
      let validPaymentsCount = 0;

      // For each debt, find payments that cover at least 30% of it
      debtorDebts.forEach((debt) => {
        const debtAmount = debt.amount.toNumber();
        const minPaymentAmount = debtAmount * MIN_PAYMENT_PERCENT;

        // Find payments after this debt
        const eligiblePayments = debtorPayments.filter(
          (payment) => payment.created_at >= debt.created_at && payment.amount.toNumber() >= minPaymentAmount,
        );

        if (eligiblePayments.length > 0) {
          const firstValidPayment = eligiblePayments[0];
          const days = Math.floor(
            (firstValidPayment.created_at.getTime() - debt.created_at.getTime()) / (1000 * 60 * 60 * 24),
          );

          totalDays += days;
          validPaymentsCount++;
        }
      });

      if (validPaymentsCount === 0) return; // No valid debt-payment pairs

      const avgDays = totalDays / validPaymentsCount;

      // If debtor has no debt, avgDaysBetweenDebtAndPayment should be 0
      const avgDaysBetweenDebtAndPayment = totalDebt > 0 ? avgDays : 0;

      // Determine rating - only calculate overdue days for debtors with debt
      let rating: "high" | "medium" | "critical";
      if (avgDays <= overdueDays - 15) {
        rating = "high";
      } else if (avgDays > overdueDays - 15 && avgDays <= overdueDays && totalDebt > 0) {
        rating = "medium";
      } else if (avgDays > overdueDays && totalDebt > 0) {
        rating = "critical";
      } else {
        rating = "high";
      }

      customerRatings.set(debtorId, {
        debtorId,
        debtor: prismaToDomainDebtor(debtor, settings),
        payments: debtorPayments.map((p) => ({
          id: p.id,
          externalId: p.id.toString(),
          debtorId: p.debtor_id,
          amount: p.amount.toNumber(),
          paymentType: p.payment_type as PaymentDomain["paymentType"],
          note: p.note,
          createdAt: p.created_at,
          createdBy: p.created_by,
        })),
        validPayments: validPaymentsCount,
        avgDaysBetweenPayments: avgDaysBetweenDebtAndPayment,
        avgDaysBetweenDebtAndPayment: avgDaysBetweenDebtAndPayment,
        rating,
      });
    });

    // Convert to array
    let customers = Array.from(customerRatings.values());

    // Apply rating filter
    if (filters?.rating) {
      customers = customers.filter((c) => c.rating === filters.rating);
    }

    // Apply search filter
    if (filters?.search) {
      const lowerSearch = filters.search.toLowerCase();
      customers = customers.filter(
        (c) =>
          c.debtor.firstName.toLowerCase().includes(lowerSearch) ||
          c.debtor.lastName.toLowerCase().includes(lowerSearch) ||
          c.debtor.phoneNumber?.toLowerCase().includes(lowerSearch),
      );
    }

    // Apply sorting
    const sortOrder = pagination?.sortOrder ?? "desc";
    const sortBy = pagination?.sortBy ?? "date";

    customers.sort((a, b) => {
      let aVal: string | number | Date;
      let bVal: string | number | Date;

      switch (sortBy) {
        case "name":
          aVal = `${a.debtor.firstName} ${a.debtor.lastName}`.toLowerCase();
          bVal = `${b.debtor.firstName} ${b.debtor.lastName}`.toLowerCase();
          break;
        case "days":
          aVal = a.avgDaysBetweenDebtAndPayment;
          bVal = b.avgDaysBetweenDebtAndPayment;
          break;
        case "payments":
          aVal = a.validPayments;
          bVal = b.validPayments;
          break;
        case "debt":
          aVal = a.debtor.totalDebt;
          bVal = b.debtor.totalDebt;
          break;
        case "date":
        default:
          aVal = a.debtor.createdAt;
          bVal = b.debtor.createdAt;
          break;
      }

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    // Count by rating (before pagination)
    const allCustomers = Array.from(customerRatings.values());
    const counts = {
      high: allCustomers.filter((c) => c.rating === "high").length,
      medium: allCustomers.filter((c) => c.rating === "medium").length,
      critical: allCustomers.filter((c) => c.rating === "critical").length,
    };

    // Apply pagination
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 20;
    const skip = (page - 1) * limit;
    const total = customers.length;

    const paginatedCustomers = customers.slice(skip, skip + limit);

    // Convert domain ratings to view types for UI
    const viewCustomers = paginatedCustomers.map(customerRatingDomainToTableProps);

    return {
      data: viewCustomers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      counts,
    };
  }

  /**
   * Build Prisma where clause from domain filters
   */
  private buildWhereClause(filters?: DebtorDomainFilters): Prisma.DebtorWhereInput {
    const where: Prisma.DebtorWhereInput = {};

    if (filters?.search) {
      where.OR = [
        { first_name: { contains: filters.search, mode: "insensitive" } },
        { last_name: { contains: filters.search, mode: "insensitive" } },
        { phone_number: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    if (filters?.isOverdue !== undefined) {
      where.is_overdue = filters.isOverdue;
    }

    if (filters?.minDebt !== undefined || filters?.maxDebt !== undefined) {
      where.total_debt = {};
      if (filters.minDebt !== undefined) {
        where.total_debt.gte = filters.minDebt;
      }
      if (filters.maxDebt !== undefined) {
        where.total_debt.lte = filters.maxDebt;
      }
    }

    if (filters?.createdBy) {
      where.created_by = filters.createdBy;
    }

    // Status filter (business logic)
    if (filters?.status) {
      switch (filters.status) {
        case "paid_off":
          where.total_debt = { lte: 0 };
          break;
        case "overdue":
          where.is_overdue = true;
          break;
        case "active":
          where.total_debt = { gt: 0 };
          where.is_overdue = false;
          break;
      }
    }

    return where;
  }

  /**
   * Build Prisma orderBy from pagination options
   */
  private buildOrderBy(sortBy?: string, sortOrder?: "asc" | "desc"): Prisma.DebtorOrderByWithRelationInput {
    const order = sortOrder ?? "desc";

    if (!sortBy) {
      return { created_at: order };
    }

    const fieldMap: Record<string, keyof Prisma.DebtorOrderByWithRelationInput> = {
      name: "first_name",
      debt: "total_debt",
      date: "created_at",
      updated: "updated_at",
    };

    const field = fieldMap[sortBy] ?? sortBy;
    return { [field]: order } as Prisma.DebtorOrderByWithRelationInput;
  }
}

// Export singleton instance
export const debtorService = new DebtorService();
