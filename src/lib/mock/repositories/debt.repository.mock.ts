import { Prisma as PrismaRuntime, type Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { getMockStore, mockAggregateDebts, mockFindDebts } from "../mock-store";

export class MockDebtRepository {
  async findById(id: number, include?: Prisma.DebtInclude) {
    const rows = mockFindDebts({ id }, { take: 1, include });
    return rows[0] ?? null;
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
    return mockFindDebts(where, options);
  }

  async count(where: Prisma.DebtWhereInput) {
    return mockFindDebts(where).length;
  }

  async create(data: Prisma.DebtCreateInput) {
    const store = getMockStore();
    const id = store.nextId.debt++;
    const debtorId = typeof data.debtor === "object" && data.debtor.connect?.id ? data.debtor.connect.id : 0;
    const createdBy = typeof data.creator === "object" && data.creator.connect?.id ? data.creator.connect.id : 1;
    const amount = new PrismaRuntime.Decimal(Number(data.amount));
    const debt = {
      id,
      external_id: randomUUID(),
      debtor_id: debtorId,
      amount,
      description: (data.description as string | null) ?? null,
      items: (data.items as Prisma.JsonValue) ?? null,
      created_at: data.created_at ? new Date(String(data.created_at)) : new Date(),
      created_by: createdBy,
    };
    store.debts.push(debt);
    const debtor = store.debtors.find((d) => d.id === debtorId);
    if (debtor) {
      debtor.total_debt = new PrismaRuntime.Decimal(debtor.total_debt.toNumber() + amount.toNumber());
      debtor.updated_at = new Date();
    }
    return debt;
  }

  async update(id: number, data: Prisma.DebtUpdateInput) {
    const store = getMockStore();
    const idx = store.debts.findIndex((d) => d.id === id);
    if (idx < 0) throw new Error("Debt not found");
    const cur = store.debts[idx];
    const updated = {
      ...cur,
      amount: data.amount !== undefined ? new PrismaRuntime.Decimal(Number(data.amount)) : cur.amount,
      description: data.description !== undefined ? (data.description as string | null) : cur.description,
    };
    store.debts[idx] = updated;
    return updated;
  }

  async delete(id: number) {
    const store = getMockStore();
    store.debts = store.debts.filter((d) => d.id !== id);
    return { id };
  }

  async aggregate(where: Prisma.DebtWhereInput) {
    return mockAggregateDebts(where);
  }
}

export const mockDebtRepository = new MockDebtRepository();
