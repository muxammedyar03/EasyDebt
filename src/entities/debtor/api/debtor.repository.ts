import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/**
 * Debtor entity – API (repository).
 * Data access for Debtor; only Prisma queries, no business logic.
 *
 * Return types: findById, findFirst, findMany return Prisma payloads. When using `include`,
 * TypeScript may not narrow the return type; callers can assert e.g.
 * `as Prisma.DebtorGetPayload<{ include: { debts: true; payments: true } }>[]` when needed.
 */
export class DebtorRepository {
  async findById(id: number, shop_id: number, include?: Prisma.DebtorInclude) {
    return prisma.debtor.findUnique({
      where: { id, shop_id },
      include,
    });
  }

  async findFirst(where: Prisma.DebtorWhereInput, include?: Prisma.DebtorInclude) {
    return prisma.debtor.findFirst({
      where,
      include,
    });
  }

  /**
   * When options.include is set, consider asserting the result type to the matching
   * Prisma.DebtorGetPayload<{ include: ... }> for accurate typing downstream.
   */
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

  async delete(id: number, shop_id: number) {
    return prisma.debtor.delete({ where: { id, shop_id } });
  }

  async deleteMany(where: Prisma.DebtorWhereInput) {
    return prisma.debtor.deleteMany({ where });
  }

  async aggregate(where: Prisma.DebtorWhereInput) {
    return prisma.debtor.aggregate({
      where,
      _sum: { total_debt: true },
    });
  }
}

export const debtorRepository = new DebtorRepository();
