import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/**
 * CompanyPayment entity – API (repository).
 */
export class CompanyPaymentRepository {
  async findById(id: number, include?: Prisma.CompanyPaymentInclude) {
    return prisma.companyPayment.findUnique({
      where: { id },
      include,
    });
  }

  async findFirst(where: Prisma.CompanyPaymentWhereInput, include?: Prisma.CompanyPaymentInclude) {
    return prisma.companyPayment.findFirst({
      where,
      include,
    });
  }

  async findMany(
    where: Prisma.CompanyPaymentWhereInput,
    options?: {
      skip?: number;
      take?: number;
      orderBy?: Prisma.CompanyPaymentOrderByWithRelationInput;
      include?: Prisma.CompanyPaymentInclude;
    },
  ) {
    return prisma.companyPayment.findMany({
      where,
      ...options,
    });
  }

  async count(where: Prisma.CompanyPaymentWhereInput) {
    return prisma.companyPayment.count({ where });
  }

  async create(data: Prisma.CompanyPaymentCreateInput, include?: Prisma.CompanyPaymentInclude) {
    return prisma.companyPayment.create({ data, include });
  }

  async update(id: number, data: Prisma.CompanyPaymentUpdateInput, include?: Prisma.CompanyPaymentInclude) {
    return prisma.companyPayment.update({
      where: { id },
      data,
      include,
    });
  }

  async delete(id: number) {
    return prisma.companyPayment.delete({ where: { id } });
  }

  async aggregate(where: Prisma.CompanyPaymentWhereInput) {
    return prisma.companyPayment.aggregate({
      where,
      _sum: { amount: true },
    });
  }

  async findWithReceipt(
    where: Prisma.CompanyPaymentWhereInput = { receipt_path: { not: null } },
    options?: {
      skip?: number;
      take?: number;
      orderBy?: Prisma.CompanyPaymentOrderByWithRelationInput;
      include?: Prisma.CompanyPaymentInclude;
    },
  ) {
    return prisma.companyPayment.findMany({
      where: {
        ...where,
        receipt_path: { not: null },
      },
      ...options,
    });
  }
}

export const companyPaymentRepository = new CompanyPaymentRepository();
