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

  async findFirst(where: Prisma.DebtorWhereInput, include?: Prisma.DebtorInclude) {
    return prisma.debtor.findFirst({
      where,
      include,
    });
  }

  async findMany(
    where: Prisma.DebtorWhereInput,
    options?: {
      skip?: number;
      take?: number;
      orderBy?: Prisma.DebtorOrderByWithRelationInput;
      include?: Prisma.DebtorInclude;
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

  async create(data: Prisma.DebtorCreateInput, include?: Prisma.DebtorInclude) {
    return prisma.debtor.create({ data, include });
  }

  async update(id: number, data: Prisma.DebtorUpdateInput, include?: Prisma.DebtorInclude) {
    return prisma.debtor.update({
      where: { id },
      data,
      include,
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
