import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

const DEFAULT_INCLUDE = { debtor: true, creator: true } satisfies Prisma.PaymentReminderInclude;

/**
 * PaymentReminder entity – API (repository).
 * Data access only; no business logic.
 */
export class PaymentReminderRepository {
  async findById(id: number, include: Prisma.PaymentReminderInclude = DEFAULT_INCLUDE) {
    return prisma.paymentReminder.findUnique({
      where: { id },
      include,
    });
  }

  async findFirst(
    where: Prisma.PaymentReminderWhereInput,
    options?: { orderBy?: Prisma.PaymentReminderOrderByWithRelationInput; include?: Prisma.PaymentReminderInclude },
  ) {
    const { orderBy, include = DEFAULT_INCLUDE } = options ?? {};
    return prisma.paymentReminder.findFirst({
      where,
      orderBy,
      include,
    });
  }

  async findMany(
    where: Prisma.PaymentReminderWhereInput,
    options?: {
      skip?: number;
      take?: number;
      orderBy?: Prisma.PaymentReminderOrderByWithRelationInput;
      include?: Prisma.PaymentReminderInclude;
    },
  ) {
    const { skip, take, orderBy, include = DEFAULT_INCLUDE } = options ?? {};
    return prisma.paymentReminder.findMany({
      where,
      skip,
      take,
      orderBy,
      include,
    });
  }

  async count(where: Prisma.PaymentReminderWhereInput) {
    return prisma.paymentReminder.count({ where });
  }

  async create(data: Prisma.PaymentReminderCreateInput, include: Prisma.PaymentReminderInclude = DEFAULT_INCLUDE) {
    return prisma.paymentReminder.create({ data, include });
  }

  async update(
    id: number,
    data: Prisma.PaymentReminderUpdateInput,
    include: Prisma.PaymentReminderInclude = DEFAULT_INCLUDE,
  ) {
    return prisma.paymentReminder.update({
      where: { id },
      data,
      include,
    });
  }

  async delete(id: number) {
    return prisma.paymentReminder.delete({ where: { id } });
  }

  async deleteMany(where: Prisma.PaymentReminderWhereInput) {
    return prisma.paymentReminder.deleteMany({ where });
  }
}

export const paymentReminderRepository = new PaymentReminderRepository();
