import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/**
 * Repository layer – Debtor.
 * Faqat Prisma querylar, hech qanday business logic yoki domain conversion yo'q.
 */
export class DebtorRepository {
  async findById(id: number, include?: Prisma.DebtorInclude) {
    return prisma.debtor.findUnique({
      where: { id },
      include,
    });
  }

  async findMany(
    where: Prisma.DebtorWhereInput,
    options?: {
      skip?: number;
      take?: number;
      orderBy?: Prisma.DebtorOrderByWithRelationInput;
    },
  ) {
    return prisma.debtor.findMany({
      where,
      ...options,
    });
  }

  async count(where: Prisma.DebtorWhereInput) {
    return prisma.debtor.count({ where });
  }

  async create(data: Prisma.DebtorCreateInput) {
    return prisma.debtor.create({ data });
  }

  async update(id: number, data: Prisma.DebtorUpdateInput) {
    return prisma.debtor.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    return prisma.debtor.delete({ where: { id } });
  }

  async aggregate(where: Prisma.DebtorWhereInput) {
    return prisma.debtor.aggregate({
      where,
      _sum: { total_debt: true },
    });
  }
}

export const debtorRepository = new DebtorRepository();
