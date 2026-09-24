import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

import { listPredicate, listOrder, countQuery, idsQuery, type ListFilters } from "./debtor-list-query";

type ListRow = Prisma.DebtorGetPayload<{ include: { debts: true; payments: true; creator: true } }>;
export type ListReader = { count(): Promise<number>; read(skip: number, take: number): Promise<ListRow[]> };

/**
 * Debtor entity – API (repository).
 * Data access for Debtor; only Prisma queries, no business logic.
 *
 * Return types: findById, findFirst, findMany return Prisma payloads. When using `include`,
 * TypeScript may not narrow the return type; callers can assert e.g.
 * `as Prisma.DebtorGetPayload<{ include: { debts: true; payments: true } }>[]` when needed.
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

  async delete(id: number) {
    return prisma.debtor.delete({ where: { id } });
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

  /** Snapshot-backed candidate reader: list, relations, count share a single predicate. */
  async withListReader<T>(
    clientId: number,
    filters: ListFilters,
    sort: { sortBy?: string; sortOrder?: string },
    consume: (reader: ListReader) => Promise<T>,
  ): Promise<T> {
    const where = listPredicate(clientId, filters);
    const order = listOrder(sort.sortBy, sort.sortOrder);
    return prisma.$transaction(
      async (tx) =>
        consume({
          count: async () => (await tx.$queryRaw<{ total: number }[]>(countQuery(where)))[0].total,
          read: async (skip, take) => {
            const ids = await tx.$queryRaw<{ id: number }[]>(idsQuery(where, order, skip, take));
            if (!ids.length) return [];
            const rows = await tx.debtor.findMany({
              where: { client_id: clientId, id: { in: ids.map((row) => row.id) } },
              include: {
                debts: { where: { client_id: clientId } },
                payments: { where: { client_id: clientId } },
                creator: true,
              },
            });
            const byId = new Map(rows.map((row) => [row.id, row]));
            return ids.map(({ id }) => byId.get(id)!);
          },
        }),
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 30_000 },
    );
  }
}

export const debtorRepository = new DebtorRepository();
