import { serializableTransaction } from "@/lib/security/serializable";
/**
 * SERVICE - CompanyDebt create/update with company total_debt sync
 */

import { companyDebtRepository } from "@/entities/company-debt/api";
import { prismaToDomainCompanyDebt } from "@/lib/mappers/company.mapper";
import { companyDailySnapshotService } from "@/lib/services/company-daily-snapshot.service";
import type {
  CompanyDebtDomain,
  CreateCompanyDebtDomainInput,
  UpdateCompanyDebtDomainInput,
} from "@/types/domain/company-debt.domain";
import { Prisma } from "@prisma/client";

export class CompanyDebtService {
  async findById(clientId: number, id: number): Promise<CompanyDebtDomain | null> {
    const row = await companyDebtRepository.findFirst({ id, client_id: clientId });
    return row ? prismaToDomainCompanyDebt(row) : null;
  }

  async create(clientId: number, input: CreateCompanyDebtDomainInput): Promise<CompanyDebtDomain> {
    const result = await serializableTransaction(async (tx) => {
      const company = await tx.company.findFirst({ where: { id: input.companyId, client_id: clientId } });
      if (!company) {
        throw new Error("Kompaniya topilmadi");
      }

      const debt = await tx.companyDebt.create({
        data: {
          company_id: input.companyId,
          client_id: clientId,
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

      await companyDailySnapshotService.refreshForDate(clientId, new Date(), tx);
      return debt;
    });

    return prismaToDomainCompanyDebt(result);
  }

  async update(clientId: number, id: number, input: UpdateCompanyDebtDomainInput): Promise<CompanyDebtDomain> {
    const result = await serializableTransaction(async (tx) => {
      const existing = await tx.companyDebt.findFirst({ where: { id, client_id: clientId } });
      if (!existing) {
        throw new Error("Qarz topilmadi");
      }

      const nextAmount = new Prisma.Decimal(input.amount ?? existing.amount);
      const delta = nextAmount.minus(existing.amount);

      const debt = await tx.companyDebt.update({
        where: { id },
        data: {
          ...(input.amount !== undefined ? { amount: input.amount } : {}),
          ...(input.note !== undefined ? { note: input.note } : {}),
          ...(input.items !== undefined ? { items: input.items as Prisma.InputJsonValue } : {}),
        },
      });

      if (!delta.isZero()) {
        await tx.company.update({
          where: { id: existing.company_id },
          data: { total_debt: { increment: delta } },
        });
      }

      await companyDailySnapshotService.refreshForDate(clientId, new Date(), tx);
      return debt;
    });

    return prismaToDomainCompanyDebt(result);
  }

  async delete(clientId: number, id: number): Promise<void> {
    await serializableTransaction(async (tx) => {
      const existing = await tx.companyDebt.findFirst({ where: { id, client_id: clientId } });
      if (!existing) {
        throw new Error("Qarz topilmadi");
      }

      await tx.companyDebt.delete({ where: { id } });
      await tx.company.update({
        where: { id: existing.company_id },
        data: { total_debt: { decrement: existing.amount } },
      });
      await companyDailySnapshotService.refreshForDate(clientId, new Date(), tx);
    });
  }
}

export const companyDebtService = new CompanyDebtService();
