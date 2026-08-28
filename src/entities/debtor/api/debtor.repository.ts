import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/** Escape LIKE wildcards % and _ for safe use in ILIKE. */
function escapeLike(term: string): string {
  return term.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

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

  /**
   * Search debtors by terms: substring match on first_name, last_name, address;
   * phone matches by digits only (any format: +1 114, 4123, 1445).
   * Returns IDs in creation order (newest first), limited.
   */
  async searchIds(clientId: number, searchTerms: string[], limit: number): Promise<number[]> {
    if (searchTerms.length === 0) return [];
    const conditions = searchTerms.map((term) => {
      const namePattern = `%${escapeLike(term)}%`;
      const digitPart = term.replace(/\D/g, "");
      const digitPattern = digitPart ? `%${digitPart}%` : null;
      return {
        namePattern,
        digitPattern,
      };
    });
    const params: (string | number)[] = [clientId];
    const parts: string[] = [];
    let idx = 1;
    for (const c of conditions) {
      const orClauses: string[] = [
        `first_name ILIKE $${++idx}`,
        `last_name ILIKE $${++idx}`,
        `address ILIKE $${++idx}`,
      ];
      params.push(c.namePattern, c.namePattern, c.namePattern);
      if (c.digitPattern) {
        orClauses.push(`(phone_number IS NOT NULL AND regexp_replace(phone_number, '[^0-9]', '', 'g') LIKE $${++idx})`);
        params.push(c.digitPattern);
      }
      parts.push(`(${orClauses.join(" OR ")})`);
    }
    params.push(limit);
    const whereClause = parts.join(" AND ");
    const result = await prisma.$queryRawUnsafe<{ id: number }[]>(
      `SELECT id FROM debtors WHERE client_id = $1 AND ${whereClause} ORDER BY created_at DESC LIMIT $${idx + 1}`,
      ...params,
    );
    return result.map((r) => r.id);
  }
}

export const debtorRepository = new DebtorRepository();
