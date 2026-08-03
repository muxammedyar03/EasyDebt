import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/**
 * CompanyDebt entity – API (repository).
 */
export class CompanyDebtRepository {
  async findById(id: number, include?: Prisma.CompanyDebtInclude) {
    return prisma.companyDebt.findUnique({
      where: { id },
      include,
    });
  }

  async findMany(
    where: Prisma.CompanyDebtWhereInput,
    options?: {
      skip?: number;
      take?: number;
      orderBy?: Prisma.CompanyDebtOrderByWithRelationInput;
      include?: Prisma.CompanyDebtInclude;
    },
  ) {
    return prisma.companyDebt.findMany({
      where,
      ...options,
    });
  }

  async count(where: Prisma.CompanyDebtWhereInput) {
    return prisma.companyDebt.count({ where });
  }

  async create(data: Prisma.CompanyDebtCreateInput, include?: Prisma.CompanyDebtInclude) {
    return prisma.companyDebt.create({ data, include });
  }

  async update(id: number, data: Prisma.CompanyDebtUpdateInput, include?: Prisma.CompanyDebtInclude) {
    return prisma.companyDebt.update({
      where: { id },
      data,
      include,
    });
  }

  async delete(id: number) {
    return prisma.companyDebt.delete({ where: { id } });
  }

  async aggregate(where: Prisma.CompanyDebtWhereInput) {
    return prisma.companyDebt.aggregate({
      where,
      _sum: { amount: true },
    });
  }
}

export const companyDebtRepository = new CompanyDebtRepository();
