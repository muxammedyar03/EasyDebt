import { serializableTransaction } from "@/lib/security/serializable";
/**
 * SERVICE - CompanyPayment create/update with company total_debt sync
 */

import { type PaymentType, Prisma } from "@prisma/client";
import { companyPaymentRepository } from "@/entities/company-payment/api";
import { prismaToDomainCompany, prismaToDomainCompanyPayment } from "@/lib/mappers/company.mapper";
import { companyDailySnapshotService } from "@/lib/services/company-daily-snapshot.service";
import type {
  CompanyPaymentDomain,
  CreateCompanyPaymentDomainInput,
  UpdateCompanyPaymentDomainInput,
} from "@/types/domain/company-payment.domain";

type CompanyPaymentWithCompany = Prisma.CompanyPaymentGetPayload<{ include: { company: true } }>;

export class CompanyPaymentService {
  async findById(clientId: number, id: number): Promise<CompanyPaymentDomain | null> {
    const row = (await companyPaymentRepository.findFirst(
      { id, client_id: clientId },
      { company: true },
    )) as CompanyPaymentWithCompany | null;
    if (!row) return null;
    const domain = prismaToDomainCompanyPayment(row);
    domain.company = prismaToDomainCompany(row.company);
    return domain;
  }

  async create(clientId: number, input: CreateCompanyPaymentDomainInput): Promise<CompanyPaymentDomain> {
    const result = await serializableTransaction(async (tx) => {
      const company = await tx.company.findFirst({ where: { id: input.companyId, client_id: clientId } });
      if (!company) {
        throw new Error("Kompaniya topilmadi");
      }

      const payment = await tx.companyPayment.create({
        data: {
          company_id: input.companyId,
          client_id: clientId,
          amount: input.amount,
          payment_type: input.paymentType as PaymentType,
          note: input.note?.trim() || null,
          receipt_path: input.receiptPath ?? null,
          receipt_name: input.receiptName ?? null,
          receipt_mime: input.receiptMime ?? null,
          receipt_size: input.receiptSize ?? null,
          created_by: input.createdBy,
        },
      });

      await tx.company.update({
        where: { id: input.companyId },
        data: {
          total_debt: { decrement: input.amount },
          last_payment_date: new Date(),
          is_overdue: false,
        },
      });

      return payment;
    });

    await companyDailySnapshotService.refreshForDate(clientId, new Date());
    return prismaToDomainCompanyPayment(result);
  }

  async update(clientId: number, id: number, input: UpdateCompanyPaymentDomainInput): Promise<CompanyPaymentDomain> {
    const result = await serializableTransaction(async (tx) => {
      const existing = await tx.companyPayment.findFirst({ where: { id, client_id: clientId } });
      if (!existing) {
        throw new Error("To'lov topilmadi");
      }

      const nextAmount = new Prisma.Decimal(input.amount ?? existing.amount);
      const delta = nextAmount.minus(existing.amount);

      const payment = await tx.companyPayment.update({
        where: { id },
        data: {
          ...(input.amount !== undefined ? { amount: input.amount } : {}),
          ...(input.paymentType !== undefined ? { payment_type: input.paymentType as PaymentType } : {}),
          ...(input.note !== undefined ? { note: input.note } : {}),
          ...(input.receiptPath !== undefined ? { receipt_path: input.receiptPath } : {}),
          ...(input.receiptName !== undefined ? { receipt_name: input.receiptName } : {}),
          ...(input.receiptMime !== undefined ? { receipt_mime: input.receiptMime } : {}),
          ...(input.receiptSize !== undefined ? { receipt_size: input.receiptSize } : {}),
        },
      });

      if (!delta.isZero()) {
        await tx.company.update({
          where: { id: existing.company_id },
          data: { total_debt: { decrement: delta } },
        });
      }

      return payment;
    });

    await companyDailySnapshotService.refreshForDate(clientId, new Date());
    return prismaToDomainCompanyPayment(result);
  }

  async delete(clientId: number, id: number): Promise<CompanyPaymentDomain> {
    const result = await serializableTransaction(async (tx) => {
      const existing = await tx.companyPayment.findFirst({
        where: { id, client_id: clientId },
        include: { company: true },
      });
      if (!existing) {
        throw new Error("To'lov topilmadi");
      }

      await tx.companyPayment.delete({ where: { id } });
      await tx.company.update({
        where: { id: existing.company_id },
        data: { total_debt: { increment: existing.amount } },
      });

      return existing;
    });

    await companyDailySnapshotService.refreshForDate(clientId, new Date());
    return prismaToDomainCompanyPayment(result);
  }

  async listWithReceipts(clientId: number, options?: { page?: number; limit?: number }) {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = { client_id: clientId, receipt_path: { not: null } };
    const [rows, total] = await Promise.all([
      companyPaymentRepository.findWithReceipt(where, {
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        include: { company: true },
      }),
      companyPaymentRepository.count(where),
    ]);

    return {
      data: rows.map(prismaToDomainCompanyPayment),
      rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

export const companyPaymentService = new CompanyPaymentService();
