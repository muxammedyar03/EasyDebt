import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/**
 * Repository layer – Payment.
 * Faqat Prisma querylar, hech qanday business logic yoki domain conversion yo'q.
 */
export class PaymentRepository {
  async findById(id: number, include?: Prisma.PaymentInclude) {
    return prisma.payment.findUnique({
      where: { id },
      include,
    });
  }

  async findMany(
    where: Prisma.PaymentWhereInput,
    options?: {
      skip?: number;
      take?: number;
      orderBy?: Prisma.PaymentOrderByWithRelationInput;
      include?: Prisma.PaymentInclude;
    },
  ) {
    return prisma.payment.findMany({
      where,
      ...options,
    });
  }

  async count(where: Prisma.PaymentWhereInput) {
    return prisma.payment.count({ where });
  }

  async create(data: Prisma.PaymentCreateInput) {
    return prisma.payment.create({ data });
  }

  async update(id: number, data: Prisma.PaymentUpdateInput) {
    return prisma.payment.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    return prisma.payment.delete({ where: { id } });
  }

  async aggregate(where: Prisma.PaymentWhereInput) {
    return prisma.payment.aggregate({
      where,
      _sum: { amount: true },
    });
  }
}

export const paymentRepository = new PaymentRepository();
