import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/**
 * Debt entity – API (repository).
 * Data access for Debt; only Prisma queries, no business logic.
 */
export class DebtRepository {
  async findById(id: number, include?: Prisma.DebtInclude) {
    return prisma.debt.findUnique({
      where: { id },
      include,
    });
  }

  async findMany(
    where: Prisma.DebtWhereInput,
    options?: {
      skip?: number;
      take?: number;
      orderBy?: Prisma.DebtOrderByWithRelationInput;
      include?: Prisma.DebtInclude;
    },
  ) {
    return prisma.debt.findMany({
      where,
      ...options,
    });
  }

  async count(where: Prisma.DebtWhereInput) {
    return prisma.debt.count({ where });
  }

  async create(data: Prisma.DebtCreateInput) {
    return prisma.debt.create({ data });
  }

  async update(id: number, data: Prisma.DebtUpdateInput) {
    return prisma.debt.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    return prisma.debt.delete({ where: { id } });
  }

  async aggregate(where: Prisma.DebtWhereInput) {
    return prisma.debt.aggregate({
      where,
      _sum: { amount: true },
    });
  }
}

export const debtRepository = new DebtRepository();
