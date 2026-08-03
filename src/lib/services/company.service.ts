/**
 * SERVICE LAYER - Company business operations
 * Returns Domain types only.
 */

import type { Prisma } from "@prisma/client";
import { companyRepository } from "@/entities/company/api";
import { companyDebtRepository } from "@/entities/company-debt/api";
import { companyPaymentRepository } from "@/entities/company-payment/api";
import { settingsRepository } from "@/entities/settings/api";
import { buildCompanyStats, calculateCompanyOverdueStatus } from "@/entities/company/model";
import { prismaToDomainCompany, domainToViewCompany, domainToDetailViewCompany } from "@/lib/mappers/company.mapper";
import type {
  CompanyDomain,
  CompanyDomainFilters,
  CompanyPaginationOptions,
  CompanyStats,
  CreateCompanyDomainInput,
  UpdateCompanyDomainInput,
} from "@/types/domain/company.domain";
import type { PaginatedResult } from "@/types/domain/debtor.domain";
import type { CompanyDetailView, CompanyView } from "@/types/view/company.view";

type CompanyWithRelations = Prisma.CompanyGetPayload<{
  include: { debts: true; payments: true; creator: true };
}>;

export class CompanyService {
  private async getSettings() {
    const [debtLimit, overdueDays] = await Promise.all([
      settingsRepository.getDebtLimit(),
      settingsRepository.getOverdueDays(),
    ]);
    return { debtLimit, overdueDays };
  }

  async getOverdueDays(): Promise<number> {
    return settingsRepository.getOverdueDays();
  }

  async debtLimit(): Promise<number> {
    return settingsRepository.getDebtLimit();
  }

  async findById(id: number, includeRelations = false): Promise<CompanyDomain | null> {
    const settings = await this.getSettings();
    const row = await companyRepository.findById(
      id,
      includeRelations ? { debts: true, payments: true, creator: true } : { creator: true },
    );
    if (!row) return null;
    return prismaToDomainCompany(row, settings);
  }

  async findByExternalId(externalId: string, includeRelations = false): Promise<CompanyDomain | null> {
    const settings = await this.getSettings();
    const row = await companyRepository.findFirst(
      { external_id: externalId },
      includeRelations
        ? {
            debts: { orderBy: { created_at: "desc" } },
            payments: { orderBy: { created_at: "desc" } },
            creator: true,
          }
        : { creator: true },
    );
    if (!row) return null;
    return prismaToDomainCompany(row, settings);
  }

  private buildOrderBy(
    sortBy?: CompanyPaginationOptions["sortBy"],
    sortOrder: "asc" | "desc" = "desc",
  ): Prisma.CompanyOrderByWithRelationInput {
    switch (sortBy) {
      case "name":
        return { name: sortOrder };
      case "amount":
        return { total_debt: sortOrder };
      case "debt_added_at":
        return { last_debt_date: sortOrder };
      case "paid_at":
        return { last_payment_date: sortOrder };
      case "created_at":
      default:
        return { created_at: sortOrder };
    }
  }

  private async buildWhere(filters?: CompanyDomainFilters): Promise<Prisma.CompanyWhereInput> {
    const settings = await this.getSettings();
    const where: Prisma.CompanyWhereInput = {};

    if (filters?.createdBy !== undefined) {
      where.created_by = filters.createdBy;
    }

    if (filters?.search?.trim()) {
      const terms = filters.search.trim().split(/\s+/).filter(Boolean);
      const ids = await companyRepository.searchIds(terms, 500);
      where.id = { in: ids.length > 0 ? ids : [-1] };
    }

    const debtFilter: Prisma.DecimalFilter = {
      ...(filters?.minDebt !== undefined ? { gte: filters.minDebt } : {}),
      ...(filters?.maxDebt !== undefined ? { lte: filters.maxDebt } : {}),
    };

    if (filters?.dateFrom || filters?.dateTo) {
      where.OR = [
        {
          debts: {
            some: {
              created_at: {
                ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
                ...(filters.dateTo ? { lte: filters.dateTo } : {}),
              },
            },
          },
        },
        {
          payments: {
            some: {
              created_at: {
                ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
                ...(filters.dateTo ? { lte: filters.dateTo } : {}),
              },
            },
          },
        },
      ];
    }

    const status = filters?.status;
    if (status && status !== "all") {
      switch (status) {
        case "tolangan":
          debtFilter.lte = 0;
          break;
        case "qarzdor":
          debtFilter.gt = 0;
          if (filters?.maxDebt === undefined) {
            debtFilter.lt = settings.debtLimit;
          }
          break;
        case "muddati_otgan":
          where.is_overdue = true;
          debtFilter.gt = 0;
          break;
        case "limitdan_otgan":
          debtFilter.gte = settings.debtLimit;
          break;
      }
    }

    if (Object.keys(debtFilter).length > 0) {
      where.total_debt = debtFilter;
    }

    if (filters?.isOverdue !== undefined) {
      where.is_overdue = filters.isOverdue;
    }

    return where;
  }

  async findMany(
    filters?: CompanyDomainFilters,
    pagination?: CompanyPaginationOptions,
  ): Promise<PaginatedResult<CompanyDomain>> {
    const settings = await this.getSettings();
    const where = await this.buildWhere(filters);
    const orderBy = this.buildOrderBy(pagination?.sortBy, pagination?.sortOrder ?? "desc");

    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 10;
    const skip = (page - 1) * limit;

    const [total, rows] = await Promise.all([
      companyRepository.count(where),
      companyRepository.findMany(where, {
        orderBy,
        skip,
        take: limit,
        include: {
          debts: true,
          payments: true,
          creator: true,
        },
      }) as Promise<CompanyWithRelations[]>,
    ]);

    const data = rows.map((row) => {
      const domain = prismaToDomainCompany(row, settings);
      // Persist computed overdue onto domain; optionally sync DB later via cron
      const overdue = calculateCompanyOverdueStatus({
        totalDebt: domain.totalDebt,
        lastPaymentDate: domain.lastPaymentDate,
        lastDebtDate: domain.lastDebtDate,
        createdAt: domain.createdAt,
        overdueDays: settings.overdueDays,
      });
      return { ...domain, isOverdue: overdue.isOverdue, daysOverdue: overdue.daysOverdue };
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  private getTodayDateRange() {
    return {
      gte: new Date(new Date().setHours(0, 0, 0, 0)),
      lte: new Date(new Date().setHours(23, 59, 59, 999)),
    };
  }

  async companiesCount(): Promise<number> {
    return companyRepository.count({});
  }

  async companiesTotalDebt(): Promise<number> {
    const result = await companyRepository.aggregate({});
    return result._sum.total_debt?.toNumber() ?? 0;
  }

  async companiesTotalPayments(): Promise<number> {
    const result = await companyPaymentRepository.aggregate({});
    return result._sum.amount?.toNumber() ?? 0;
  }

  async companiesTotalDebtsAmount(): Promise<number> {
    const result = await companyDebtRepository.aggregate({});
    return result._sum.amount?.toNumber() ?? 0;
  }

  async todayDebtsCount(): Promise<number> {
    return companyDebtRepository.count({ created_at: this.getTodayDateRange() });
  }

  async todayDebtsAmount(): Promise<number> {
    const result = await companyDebtRepository.aggregate({ created_at: this.getTodayDateRange() });
    return result._sum.amount?.toNumber() ?? 0;
  }

  async todayPaymentsCount(): Promise<number> {
    return companyPaymentRepository.count({ created_at: this.getTodayDateRange() });
  }

  async todayPaymentsAmount(): Promise<number> {
    const result = await companyPaymentRepository.aggregate({ created_at: this.getTodayDateRange() });
    return result._sum.amount?.toNumber() ?? 0;
  }

  async getStats(): Promise<CompanyStats> {
    const [
      totalCompanies,
      totalDebt,
      totalDebtsCount,
      totalPaymentsAmount,
      todayDebtsCount,
      todayDebtsAmount,
      todayPaymentsCount,
      todayPaymentsAmount,
    ] = await Promise.all([
      this.companiesCount(),
      this.companiesTotalDebt(),
      companyDebtRepository.count({}),
      this.companiesTotalPayments(),
      this.todayDebtsCount(),
      this.todayDebtsAmount(),
      this.todayPaymentsCount(),
      this.todayPaymentsAmount(),
    ]);

    return buildCompanyStats({
      totalCompanies,
      totalDebt,
      totalDebtsCount,
      totalPaymentsAmount,
      todayDebtsCount,
      todayDebtsAmount,
      todayPaymentsCount,
      todayPaymentsAmount,
    });
  }

  async create(input: CreateCompanyDomainInput): Promise<CompanyDomain> {
    const settings = await this.getSettings();
    const row = await companyRepository.create(
      {
        name: input.name,
        contact_person: input.contactPerson,
        phone_number: input.phoneNumber,
        address: input.address,
        creator: { connect: { id: input.createdBy } },
      },
      { creator: true },
    );
    return prismaToDomainCompany(row, settings);
  }

  async update(id: number, input: UpdateCompanyDomainInput): Promise<CompanyDomain> {
    const settings = await this.getSettings();
    const row = await companyRepository.update(
      id,
      {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.contactPerson !== undefined ? { contact_person: input.contactPerson } : {}),
        ...(input.phoneNumber !== undefined ? { phone_number: input.phoneNumber } : {}),
        ...(input.address !== undefined ? { address: input.address } : {}),
      },
      { creator: true },
    );
    return prismaToDomainCompany(row, settings);
  }

  async delete(id: number): Promise<void> {
    await companyRepository.delete(id);
  }

  async getView(id: number): Promise<CompanyDetailView | null> {
    const domain = await this.findById(id, true);
    if (!domain) return null;
    return domainToDetailViewCompany(domain);
  }

  async getListView(
    filters?: CompanyDomainFilters,
    pagination?: CompanyPaginationOptions,
  ): Promise<PaginatedResult<CompanyView>> {
    const result = await this.findMany(filters, pagination);
    return {
      ...result,
      data: result.data.map(domainToViewCompany),
    };
  }

  /**
   * Sync persisted is_overdue flags from computed overdue status.
   */
  async syncOverdueFlags(): Promise<number> {
    const settings = await this.getSettings();
    const companies = await companyRepository.findMany({});
    let updated = 0;

    for (const company of companies) {
      const overdue = calculateCompanyOverdueStatus({
        totalDebt: company.total_debt.toNumber(),
        lastPaymentDate: company.last_payment_date,
        lastDebtDate: company.last_debt_date,
        createdAt: company.created_at,
        overdueDays: settings.overdueDays,
      });

      if (company.is_overdue !== overdue.isOverdue) {
        await companyRepository.update(company.id, { is_overdue: overdue.isOverdue });
        updated += 1;
      }
    }

    return updated;
  }
}

export const companyService = new CompanyService();
