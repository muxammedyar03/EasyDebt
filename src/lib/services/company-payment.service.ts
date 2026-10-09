import { createHash } from "crypto";
import { readFile } from "fs/promises";
import { getCompanyReceiptAbsolutePath } from "@/lib/companies/receipt-storage";
import { buildCompanyReceiptFileName } from "@/lib/companies/receipt-display";

export class PaymentConflictError extends Error {}
function paymentRequestId(clientId: number, userId: number, key: string) {
  const hex = createHash("sha256").update(`company-payment:${clientId}:${userId}:${key}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
async function receiptDigest(receiptPath: string) {
  return createHash("sha256")
    .update(await readFile(getCompanyReceiptAbsolutePath(receiptPath)))
    .digest("hex");
}
import { serializableTransaction } from "@/lib/security/serializable";
import { createRequiredAuditLog } from "@/lib/audit";
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
    const externalId = input.idempotencyKey
      ? paymentRequestId(clientId, input.createdBy, input.idempotencyKey)
      : undefined;
    const execute = () =>
      serializableTransaction(async (tx) => {
        if (externalId) {
          const existing = await tx.companyPayment.findFirst({
            where: { external_id: externalId, client_id: clientId },
          });
          if (existing) {
            if (
              existing.company_id !== input.companyId ||
              !existing.amount.equals(input.amount) ||
              existing.payment_type !== input.paymentType ||
              existing.note !== (input.note?.trim() || null) ||
              Boolean(existing.receipt_path) !== Boolean(input.receiptPath) ||
              (existing.receipt_path &&
                input.receiptPath &&
                (await receiptDigest(existing.receipt_path)) !== (await receiptDigest(input.receiptPath)))
            )
              throw new PaymentConflictError("Bu request kaliti boshqa tolov uchun ishlatilgan");
            return existing;
          }
        }
        const company = await tx.company.findFirst({ where: { id: input.companyId, client_id: clientId } });
        if (!company) {
          throw new Error("Kompaniya topilmadi");
        }

        let payment = await tx.companyPayment.create({
          data: {
            ...(externalId ? { external_id: externalId } : {}),
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

        if (payment.receipt_path) {
          payment = await tx.companyPayment.update({
            where: { id: payment.id },
            data: {
              receipt_name: buildCompanyReceiptFileName({
                companyName: company.name,
                paymentId: payment.id,
                date: payment.created_at,
                mime: payment.receipt_mime,
                receiptPath: payment.receipt_path,
              }),
            },
          });
        }
        await tx.auditLog.create({
          data: {
            client_id: clientId,
            user_id: input.createdBy,
            action: "CREATE",
            entity_type: "COMPANY_PAYMENT",
            entity_id: payment.id,
            new_value: {
              company_id: input.companyId,
              amount: new Prisma.Decimal(input.amount).toString(),
              payment_type: input.paymentType,
            },
            description: `Company payment ${payment.id}`,
          },
        });
        await companyDailySnapshotService.refreshAffectedDates(clientId, payment.created_at, tx);
        return payment;
      });
    let result;
    try {
      result = await execute();
    } catch (error) {
      // Concurrent requests can race on the unique external ID; reread the winner after rollback.
      if (!externalId || !(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002")
        throw error;
      result = await execute();
    }
    return prismaToDomainCompanyPayment(result);
  }

  async update(
    clientId: number,
    id: number,
    input: UpdateCompanyPaymentDomainInput,
    actorId?: number,
  ): Promise<CompanyPaymentDomain> {
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

      await companyDailySnapshotService.refreshAffectedDates(clientId, existing.created_at, tx);
      if (actorId)
        await createRequiredAuditLog(tx, {
          clientId,
          userId: actorId,
          action: "UPDATE",
          entityType: "COMPANY_PAYMENT",
          entityId: id,
          oldValue: {
            company_id: existing.company_id,
            amount: existing.amount.toString(),
            payment_type: existing.payment_type,
            note: existing.note,
          },
          newValue: {
            company_id: payment.company_id,
            amount: payment.amount.toString(),
            payment_type: payment.payment_type,
            note: payment.note,
          },
          description: `Kompaniya to'lovi #${id} yangilandi`,
        });
      return payment;
    });

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

      await companyDailySnapshotService.refreshAffectedDates(clientId, existing.created_at, tx);
      return existing;
    });

    return prismaToDomainCompanyPayment(result);
  }

  /** Clear the DB reference and record the actor together. Delete the file only after commit. */
  async removeReceipt(clientId: number, id: number, actorId: number): Promise<string | null> {
    return serializableTransaction(async (tx) => {
      const payment = await tx.companyPayment.findFirst({ where: { id, client_id: clientId } });
      if (!payment) throw new Error("To'lov topilmadi");
      if (!payment.receipt_path) return null;

      await tx.companyPayment.update({
        where: { id, client_id: clientId },
        data: { receipt_path: null, receipt_name: null, receipt_mime: null, receipt_size: null },
      });
      await createRequiredAuditLog(tx, {
        clientId,
        userId: actorId,
        action: "DELETE",
        entityType: "COMPANY_PAYMENT_RECEIPT",
        entityId: id,
        oldValue: { receipt_path: payment.receipt_path },
        description: `Kompaniya to'lov cheki #${id} o'chirildi`,
      });
      return payment.receipt_path;
    });
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
