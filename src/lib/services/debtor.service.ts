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

import type { Prisma } from "@prisma/client";
import { debtorRepository } from "@/entities/debtor/api";
import { settingsRepository } from "@/entities/settings/api";

/** Debtor with debts + payments + creator for findMany with include */
type DebtorWithRelations = Prisma.DebtorGetPayload<{
  include: { debts: true; payments: true; creator: true };
}>;
/** Debt with debtor for getCustomerRatings */
type DebtWithDebtor = Prisma.DebtGetPayload<{ include: { debtor: true } }>;
/** Payment with debtor for getCustomerRatings */
type PaymentWithDebtor = Prisma.PaymentGetPayload<{ include: { debtor: true } }>;
import type {
  DebtorDomain,
  CreateDebtorDomainInput,
  UpdateDebtorDomainInput,
  DebtorDomainFilters,
  PaginationOptions,
  PaginatedResult,
  DebtorStats,
} from "@/types/domain/debtor.domain";
import { buildDebtorStats, calculatePaymentRating } from "@/entities/debtor/model";
import type {
  CustomerRatingDomain,
  CustomerRatingFilters,
  PaginatedCustomerRatingsView,
} from "@/types/domain/customer-rating.domain";
import {
  prismaToDomainDebtor,
  domainToTableViewDebtor,
  domainToDetailViewDebtor,
  domainToViewDebtor,
} from "@/lib/mappers/debtor.mapper";
import type { DebtorTableView, DebtorDetailView } from "@/types/view/debtor.view";
import { PaymentDomain } from "@/types/domain";
import { getSession } from "@/lib/auth";
import { getEffectiveShopId } from "@/lib/shop-context";
import { paymentRepository } from "@/entities/payment/api/payment.repository";
import { debtRepository } from "@/entities/debt/api/debt.repository";

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
    const session = await getSession();
    const shopId = getEffectiveShopId(session);

    if (!shopId) {
      return {
        debtLimit: 2000000,
        overdueDays: 45,
      };
    }

    const [debtLimit, overdueDays] = await Promise.all([
      settingsRepository.getDebtLimit(shopId ?? null),
      settingsRepository.getOverdueDays(shopId ?? null),
    ]);
    return { debtLimit, overdueDays };
  }

  private async getShopId(): Promise<number> {
    const session = await getSession();
    const shopId = getEffectiveShopId(session);
    if (!shopId) {
      throw new Error("Shop context not found");
    }
    return shopId;
  }

  public async getOverdueDays(): Promise<number> {
    const settings = await this.getSettings();
    return settings.overdueDays;
  }

  /**
   * Find debtor by ID (returns Domain type)
   */
  async findById(id: number, includeRelations = false): Promise<DebtorDomain | null> {
    const settings = await this.getSettings();

    const debtor = await debtorRepository.findById(id, await this.getShopId(), {
      debts: includeRelations ? { orderBy: { created_at: "desc" } } : false,
      payments: includeRelations ? { orderBy: { created_at: "desc" } } : false,
      creator: includeRelations,
    });

    if (!debtor) return null;

    return prismaToDomainDebtor(debtor, settings);
  }

  /**
   * Find debtor by external_id (UUID) — for URL-safe lookups
   */
  async findByExternalId(externalId: string, includeRelations = false): Promise<DebtorDomain | null> {
    const settings = await this.getSettings();

    const debtor = await debtorRepository.findFirst(
      { external_id: externalId },
      {
        debts: includeRelations ? { orderBy: { created_at: "desc" } } : false,
        payments: includeRelations ? { orderBy: { created_at: "desc" } } : false,
        creator: includeRelations,
      },
    );

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

    // Special handling for isOverdue filter - need to compute it runtime
    const isOverdueFilter = filters?.isOverdue;
    const filtersWithoutOverdue = { ...filters, isOverdue: undefined };

    // Build Prisma where clause from domain filters (without isOverdue)
    const where = await this.buildWhereClause(filtersWithoutOverdue);

    // Build orderBy
    const orderBy = this.buildOrderBy(pagination?.sortBy, pagination?.sortOrder);

    const { calculateDebtorOverdueStatus } = await import("@/entities/debtor/model");

    // If isOverdue filter is set, we need to fetch ALL matching debtors and filter in memory
    if (isOverdueFilter !== undefined) {
      const allDebtors = (await debtorRepository.findMany(where, {
        orderBy,
        include: {
          debts: true,
          payments: true,
          creator: true,
        },
      })) as DebtorWithRelations[];

      // Convert to domain types and calculate overdue status for all debtors
      const domainDebtors = allDebtors
        .map((d) => {
          const domainDebtor = prismaToDomainDebtor(d, settings);

          // Calculate isOverdue using the accurate function
          const debtsWithPayments = d.debts.map((debt) => ({
            amount: debt.amount.toNumber(),
            createdAt: debt.created_at,
            payments: d.payments
              .filter((p) => p.created_at >= debt.created_at)
              .map((p) => ({
                amount: p.amount.toNumber(),
                createdAt: p.created_at,
              })),
          }));

          const overdueStatus = calculateDebtorOverdueStatus(debtsWithPayments, {
            goodUntilDays: settings.overdueDays - 15,
            mediumUntilDays: settings.overdueDays,
            minPaidPercent: 0.5,
          });

          return {
            ...domainDebtor,
            isOverdue: overdueStatus.isOverdue,
          };
        })
        .filter((d) => d.isOverdue === isOverdueFilter);

      // Apply pagination manually
      const page = pagination?.page ?? 1;
      const limit = pagination?.limit ?? 10;
      const skip = (page - 1) * limit;
      const paginatedData = domainDebtors.slice(skip, skip + limit);

      return {
        data: paginatedData,
        total: domainDebtors.length,
        page,
        limit,
        totalPages: Math.ceil(domainDebtors.length / limit),
      };
    }

    // Normal flow without isOverdue filter - but still calculate overdue status correctly
    const total = await debtorRepository.count(where);

    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 10;
    const skip = (page - 1) * limit;

    const debtors = (await debtorRepository.findMany(where, {
      orderBy,
      skip,
      take: limit,
      include: {
        debts: true,
        payments: true,
        creator: true,
      },
    })) as DebtorWithRelations[];

    // Convert to domain types and calculate overdue status for all debtors
    const domainDebtors = debtors.map((d) => {
      const domainDebtor = prismaToDomainDebtor(d, settings);

      // Calculate isOverdue using the accurate function
      const debtsWithPayments = d.debts.map((debt) => ({
        amount: debt.amount.toNumber(),
        createdAt: debt.created_at,
        payments: d.payments
          .filter((p) => p.created_at >= debt.created_at)
          .map((p) => ({
            amount: p.amount.toNumber(),
            createdAt: p.created_at,
          })),
      }));

      const overdueStatus = calculateDebtorOverdueStatus(debtsWithPayments, {
        goodUntilDays: settings.overdueDays - 15,
        mediumUntilDays: settings.overdueDays,
        minPaidPercent: 0.5,
      });

      return {
        ...domainDebtor,
        isOverdue: overdueStatus.isOverdue,
      };
    });

    return {
      data: domainDebtors,
      total: total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async debtorsCount(): Promise<number> {
    return debtorRepository.count({ shop_id: await this.getShopId() });
  }

  async debtorsTotalDebt(): Promise<number> {
    const result = await debtorRepository.aggregate({ shop_id: await this.getShopId() });
    return result._sum.total_debt?.toNumber() ?? 0;
  }

  async debtorsTotalPayments(): Promise<number> {
    const result = await paymentRepository.aggregate({ shop_id: await this.getShopId() });
    return result._sum.amount?.toNumber() ?? 0;
  }

  async debtorsTotalDebts(): Promise<number> {
    const result = await debtRepository.aggregate({ shop_id: await this.getShopId() });
    return result._sum.amount?.toNumber() ?? 0;
  }

  private getTodayDateRange() {
    return {
      gte: new Date(new Date().setHours(0, 0, 0, 0)),
      lte: new Date(new Date().setHours(23, 59, 59, 999)),
    };
  }

  async todayDebtsCount(): Promise<number> {
    return debtRepository.count({
      shop_id: await this.getShopId(),
      created_at: this.getTodayDateRange(),
    });
  }

  async todayDebtsAmount(): Promise<number> {
    const result = await debtRepository.aggregate({
      shop_id: await this.getShopId(),
      created_at: this.getTodayDateRange(),
    });
    return result._sum.amount?.toNumber() ?? 0;
  }

  async todayPaymentsCount(): Promise<number> {
    return paymentRepository.count({
      shop_id: await this.getShopId(),
      created_at: this.getTodayDateRange(),
    });
  }

  async todayPaymentsAmount(): Promise<number> {
    const result = await paymentRepository.aggregate({
      shop_id: await this.getShopId(),
      created_at: this.getTodayDateRange(),
    });
    return result._sum.amount?.toNumber() ?? 0;
  }

  /**
   * Get stats for debtors
   */
  async getStats(): Promise<DebtorStats> {
    return buildDebtorStats({
      totalDebtors: await this.debtorsCount(),
      totalDebt: await this.debtorsTotalDebt(),
      totalDebtsCount: await this.todayDebtsCount(),
      todayDebtsAmount: await this.todayDebtsAmount(),
      todayDebtsCount: await this.todayDebtsCount(),
      todayPaymentsCount: await this.todayPaymentsCount(),
      todayPaymentsAmount: await this.todayPaymentsAmount(),
    });
  }

  /**
   * Create a new debtor (returns Domain type)
   */
  async create(input: CreateDebtorDomainInput): Promise<DebtorDomain> {
    const settings = await this.getSettings();

    const debtor = await debtorRepository.create(
      {
        shop: { connect: { id: await this.getShopId() } },
        first_name: input.firstName,
        last_name: input.lastName,
        phone_number: input.phoneNumber,
        address: input.address,
        creator: { connect: { id: input.createdBy } },
      },
      { creator: true },
    );

    return prismaToDomainDebtor(debtor, settings);
  }

  /**
   * Update a debtor (returns Domain type)
   */
  async update(id: number, input: UpdateDebtorDomainInput): Promise<DebtorDomain> {
    const settings = await this.getSettings();

    const debtor = await debtorRepository.update(
      id,
      {
        shop: { connect: { id: await this.getShopId() } },
        first_name: input.firstName,
        last_name: input.lastName,
        phone_number: input.phoneNumber,
        address: input.address,
      },
      { creator: true },
    );

    return prismaToDomainDebtor(debtor, settings);
  }

  /**
   * Delete a debtor
   */
  async delete(id: number): Promise<void> {
    await debtorRepository.delete(id, await this.getShopId());
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

    // Get all debts and payments
    const [debtsRaw, paymentsRaw] = (await Promise.all([
      debtRepository.findMany(
        { shop_id: await this.getShopId() },
        { include: { debtor: true }, orderBy: { created_at: "asc" } },
      ),
      paymentRepository.findMany(
        { shop_id: await this.getShopId() },
        { include: { debtor: true }, orderBy: { created_at: "asc" } },
      ),
    ])) as [DebtWithDebtor[], PaymentWithDebtor[]];

    // Group debts and payments by debtor
    const debtsByDebtor = new Map<number, DebtWithDebtor[]>();
    const paymentsByDebtor = new Map<number, PaymentWithDebtor[]>();

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
      const debtor = debtorDebts[0].debtor;
      const totalDebt = debtor.total_debt.toNumber();

      // Convert Prisma types to plain objects for utility functions
      const debtsForCalculation = debtorDebts.map((d) => ({
        amount: d.amount.toNumber(),
        createdAt: d.created_at,
      }));

      const paymentsForCalculation = debtorPayments.map((p) => ({
        amount: p.amount.toNumber(),
        createdAt: p.created_at,
      }));

      const days = calculatePaymentRating(debtsForCalculation, paymentsForCalculation, overdueDays, totalDebt);

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
        validPayments: debtorPayments.length,
        rating: {
          ...days,
          label:
            days.label === "Yomon"
              ? "critical"
              : days.label === "O'rtacha"
                ? "medium"
                : days.label === "Yaxshi"
                  ? "high"
                  : "high",
        },
      });
    });

    // Convert to array
    let customers = Array.from(customerRatings.values());

    // Apply rating filter
    if (filters?.rating) {
      customers = customers.filter((c) => c.rating.label === filters.rating);
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
          aVal = a.rating.score;
          bVal = b.rating.score;
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
      high: allCustomers.filter((c) => c.rating.label === "high").length,
      medium: allCustomers.filter((c) => c.rating.label === "medium").length,
      critical: allCustomers.filter((c) => c.rating.label === "critical").length,
    };

    // Apply pagination
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 20;
    const skip = (page - 1) * limit;
    const total = customers.length;

    const paginatedCustomers = customers.slice(skip, skip + limit);

    // Convert domain ratings to view types for UI
    const viewCustomers: PaginatedCustomerRatingsView["data"] = paginatedCustomers.map((c) => ({
      debtorId: c.debtorId,
      debtor: domainToViewDebtor(c.debtor),
      payments: c.payments,
      validPayments: c.validPayments,
      rating: c.rating,
    }));

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
  private async buildWhereClause(filters?: DebtorDomainFilters): Promise<Prisma.DebtorWhereInput> {
    const where: Prisma.DebtorWhereInput = {};

    where.shop_id = await this.getShopId();

    if (filters?.search) {
      // Split search by spaces and filter empty strings
      const searchTerms = filters.search.trim().split(/\s+/).filter(Boolean);

      if (searchTerms.length === 1) {
        // Single word search - search across all fields
        const term = searchTerms[0];
        where.OR = [
          { first_name: { contains: term, mode: "insensitive" } },
          { last_name: { contains: term, mode: "insensitive" } },
          { phone_number: { contains: term, mode: "insensitive" } },
          { address: { contains: term, mode: "insensitive" } },
        ];
      } else {
        // Multiple words - ALL terms must match somewhere (AND logic)
        // Each term can match in any field (OR logic within each term)
        where.AND = searchTerms.map((term) => ({
          OR: [
            { first_name: { contains: term, mode: "insensitive" } },
            { last_name: { contains: term, mode: "insensitive" } },
            { phone_number: { contains: term, mode: "insensitive" } },
            { address: { contains: term, mode: "insensitive" } },
          ],
        }));
      }
    }

    if (filters?.isOverdue !== undefined) {
      where.is_overdue = filters.isOverdue;
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
          where.total_debt = { gt: 0 };
          break;
        case "active":
          where.total_debt = { gt: 0 };
          where.is_overdue = false;
          break;
      }
    }

    // Apply minDebt/maxDebt filters (merge with existing total_debt conditions)
    if (filters?.minDebt !== undefined || filters?.maxDebt !== undefined) {
      if (!where.total_debt) {
        where.total_debt = {};
      }
      if (typeof where.total_debt === "object" && !Array.isArray(where.total_debt)) {
        const debtFilter = where.total_debt as Prisma.DecimalFilter<"Debtor">;
        if (filters.minDebt !== undefined) {
          debtFilter.gte = filters.minDebt;
        }
        if (filters.maxDebt !== undefined) {
          debtFilter.lte = filters.maxDebt;
        }
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
