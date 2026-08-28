import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/** Escape LIKE wildcards % and _ for safe use in ILIKE. */
function escapeLike(term: string): string {
  return term.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/**
 * Company entity – API (repository).
 * Data access only; no business logic.
 */
export class CompanyRepository {
  async findById(id: number, include?: Prisma.CompanyInclude) {
    return prisma.company.findUnique({
      where: { id },
      include,
    });
  }

  async findFirst(where: Prisma.CompanyWhereInput, include?: Prisma.CompanyInclude) {
    return prisma.company.findFirst({
      where,
      include,
    });
  }

  async findMany(
    where: Prisma.CompanyWhereInput,
    options?: {
      skip?: number;
      take?: number;
      orderBy?: Prisma.CompanyOrderByWithRelationInput | Prisma.CompanyOrderByWithRelationInput[];
      include?: Prisma.CompanyInclude;
    },
  ) {
    return prisma.company.findMany({
      where,
      ...options,
    });
  }

  async count(where: Prisma.CompanyWhereInput) {
    return prisma.company.count({ where });
  }

  async create(data: Prisma.CompanyCreateInput, include?: Prisma.CompanyInclude) {
    return prisma.company.create({ data, include });
  }

  async update(id: number, data: Prisma.CompanyUpdateInput, include?: Prisma.CompanyInclude) {
    return prisma.company.update({
      where: { id },
      data,
      include,
    });
  }

  async delete(id: number) {
    return prisma.company.delete({ where: { id } });
  }

  async aggregate(where: Prisma.CompanyWhereInput) {
    return prisma.company.aggregate({
      where,
      _sum: { total_debt: true },
    });
  }

  /**
   * Search companies by name, contact_person, address; phone by digits.
   */
  async searchIds(clientId: number, searchTerms: string[], limit: number): Promise<number[]> {
    if (searchTerms.length === 0) return [];

    const conditions = searchTerms.map((term) => {
      const namePattern = `%${escapeLike(term)}%`;
      const digitPart = term.replace(/\D/g, "");
      const digitPattern = digitPart ? `%${digitPart}%` : null;
      return { namePattern, digitPattern };
    });

    const params: (string | number)[] = [clientId];
    const parts: string[] = [];
    let idx = 1;

    for (const c of conditions) {
      const orClauses: string[] = [`name ILIKE $${++idx}`, `contact_person ILIKE $${++idx}`, `address ILIKE $${++idx}`];
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
      `SELECT id FROM companies WHERE client_id = $1 AND ${whereClause} ORDER BY created_at DESC LIMIT $${idx + 1}`,
      ...params,
    );
    return result.map((r) => r.id);
  }
}

export const companyRepository = new CompanyRepository();
