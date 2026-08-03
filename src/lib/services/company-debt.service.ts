/**
 * SERVICE - CompanyDebt create/update with company total_debt sync
 */

import { prisma } from "@/lib/prisma";
import { companyDebtRepository } from "@/entities/company-debt/api";
import { prismaToDomainCompanyDebt } from "@/lib/mappers/company.mapper";
import { companyDailySnapshotService } from "@/lib/services/company-daily-snapshot.service";
import type {
  CompanyDebtDomain,
  CreateCompanyDebtDomainInput,
  UpdateCompanyDebtDomainInput,
} from "@/types/domain/company-debt.domain";
import type { Prisma } from "@prisma/client";

export class CompanyDebtService {
  async findById(id: number): Promise<CompanyDebtDomain | null> {
    const row = await companyDebtRepository.findById(id);
    return row ? prismaToDomainCompanyDebt(row) : null;
  }

  async create(input: CreateCompanyDebtDomainInput): Promise<CompanyDebtDomain> {
    const result = await prisma.$transaction(async (tx) => {
      const company = await tx.company.findUnique({ where: { id: input.companyId } });
      if (!company) {
        throw new Error("Kompaniya topilmadi");
      }

      const debt = await tx.companyDebt.create({
        data: {
          company_id: input.companyId,
          amount: input.amount,
          note: input.note?.trim() || null,
          items: input.items === undefined ? undefined : (input.items as Prisma.InputJsonValue),
          created_by: input.createdBy,
        },
      });

      const now = new Date();
      await tx.company.update({
        where: { id: input.companyId },
        data: {
          total_debt: { increment: input.amount },
          last_debt_date: now,
        },
      });

      return debt;
    });

    await companyDailySnapshotService.refreshForDate(new Date());
    return prismaToDomainCompanyDebt(result);
  }

  async update(id: number, input: UpdateCompanyDebtDomainInput): Promise<CompanyDebtDomain> {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.companyDebt.findUnique({ where: { id } });
      if (!existing) {
        throw new Error("Qarz topilmadi");
      }

      const nextAmount = input.amount ?? existing.amount.toNumber();
      const delta = nextAmount - existing.amount.toNumber();

      const debt = await tx.companyDebt.update({
        where: { id },
        data: {
          ...(input.amount !== undefined ? { amount: input.amount } : {}),
          ...(input.note !== undefined ? { note: input.note } : {}),
          ...(input.items !== undefined ? { items: input.items as Prisma.InputJsonValue } : {}),
        },
      });

      if (delta !== 0) {
        await tx.company.update({
          where: { id: existing.company_id },
          data: { total_debt: { increment: delta } },
        });
      }

      return debt;
    });

    await companyDailySnapshotService.refreshForDate(new Date());
    return prismaToDomainCompanyDebt(result);
  }

  async delete(id: number): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.companyDebt.findUnique({ where: { id } });
      if (!existing) {
        throw new Error("Qarz topilmadi");
      }

      await tx.companyDebt.delete({ where: { id } });
      await tx.company.update({
        where: { id: existing.company_id },
        data: { total_debt: { decrement: existing.amount.toNumber() } },
      });
    });

    await companyDailySnapshotService.refreshForDate(new Date());
  }
}

export const companyDebtService = new CompanyDebtService();
