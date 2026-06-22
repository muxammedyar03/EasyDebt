import { Prisma as PrismaRuntime, type Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import {
  getMockStore,
  mockAggregateDebtors,
  mockFindDebtors,
  mockSearchDebtorIds,
  applyDebtorInclude,
} from "../mock-store";

export class MockDebtorRepository {
  async findById(id: number, include?: Prisma.DebtorInclude) {
    const store = getMockStore();
    const debtor = store.debtors.find((d) => d.id === id);
    if (!debtor) return null;
    return applyDebtorInclude(debtor, include, store);
  }

  async findFirst(where: Prisma.DebtorWhereInput, include?: Prisma.DebtorInclude) {
    const rows = mockFindDebtors(where, { take: 1, include });
    return rows[0] ?? null;
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
    return mockFindDebtors(where, options);
  }

  async count(where: Prisma.DebtorWhereInput) {
    return mockFindDebtors(where).length;
  }

  async create(data: Prisma.DebtorCreateInput, include?: Prisma.DebtorInclude) {
    const store = getMockStore();
    const id = store.nextId.debtor++;
    const now = new Date();
    const createdBy = typeof data.creator === "object" && data.creator.connect?.id ? data.creator.connect.id : 1;
    const debtor = {
      id,
      external_id: randomUUID(),
      first_name: String(data.first_name),
      last_name: String(data.last_name),
      phone_number: (data.phone_number as string | null) ?? null,
      address: (data.address as string | null) ?? null,
      total_debt: new PrismaRuntime.Decimal(0),
      last_payment_date: null,
      is_overdue: false,
      created_at: now,
      updated_at: now,
      created_by: createdBy,
    };
    store.debtors.push(debtor);
    return applyDebtorInclude(debtor, include, store);
  }

  async update(id: number, data: Prisma.DebtorUpdateInput, include?: Prisma.DebtorInclude) {
    const store = getMockStore();
    const idx = store.debtors.findIndex((d) => d.id === id);
    if (idx < 0) throw new Error("Debtor not found");
    const cur = store.debtors[idx];
    const updated = {
      ...cur,
      first_name: data.first_name !== undefined ? String(data.first_name) : cur.first_name,
      last_name: data.last_name !== undefined ? String(data.last_name) : cur.last_name,
      phone_number: data.phone_number !== undefined ? (data.phone_number as string | null) : cur.phone_number,
      address: data.address !== undefined ? (data.address as string | null) : cur.address,
      total_debt: data.total_debt !== undefined ? new PrismaRuntime.Decimal(Number(data.total_debt)) : cur.total_debt,
      is_overdue: data.is_overdue !== undefined ? Boolean(data.is_overdue) : cur.is_overdue,
      last_payment_date:
        data.last_payment_date !== undefined ? (data.last_payment_date as Date | null) : cur.last_payment_date,
      updated_at: new Date(),
    };
    store.debtors[idx] = updated;
    return applyDebtorInclude(updated, include, store);
  }

  async delete(id: number) {
    const store = getMockStore();
    store.debtors = store.debtors.filter((d) => d.id !== id);
    store.debts = store.debts.filter((d) => d.debtor_id !== id);
    store.payments = store.payments.filter((p) => p.debtor_id !== id);
    return { id };
  }

  async deleteMany(where: Prisma.DebtorWhereInput) {
    const ids = mockFindDebtors(where).map((d) => d.id);
    for (const id of ids) await this.delete(id);
    return { count: ids.length };
  }

  async aggregate(where: Prisma.DebtorWhereInput) {
    return mockAggregateDebtors(where);
  }

  async searchIds(searchTerms: string[], limit: number) {
    return mockSearchDebtorIds(searchTerms, limit);
  }

  async findIdExternalPairs(ids: number[]) {
    return getMockStore()
      .debtors.filter((d) => ids.includes(d.id))
      .map((d) => ({ id: d.id, external_id: d.external_id }));
  }
}

export const mockDebtorRepository = new MockDebtorRepository();
