import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/**
 * Repository layer – PaymentReminder.
 * Faqat Prisma querylar, hech qanday business logic yoki domain conversion yo'q.
 */
export class PaymentReminderRepository {
  async findById(id: number, include?: Prisma.PaymentReminderInclude) {
    return prisma.paymentReminder.findUnique({
      where: { id },
      include,
    });
  }

  async findMany(
    where: Prisma.PaymentReminderWhereInput,
    options?: {
      skip?: number;
      take?: number;
      orderBy?: Prisma.PaymentReminderOrderByWithRelationInput;
    },
  ) {
    return prisma.paymentReminder.findMany({
      where,
      ...options,
    });
  }

  async count(where: Prisma.PaymentReminderWhereInput) {
    return prisma.paymentReminder.count({ where });
  }

  async create(data: Prisma.PaymentReminderCreateInput) {
    return prisma.paymentReminder.create({ data });
  }

  async update(id: number, data: Prisma.PaymentReminderUpdateInput) {
    return prisma.paymentReminder.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    return prisma.paymentReminder.delete({ where: { id } });
  }
}

export const paymentReminderRepository = new PaymentReminderRepository();
