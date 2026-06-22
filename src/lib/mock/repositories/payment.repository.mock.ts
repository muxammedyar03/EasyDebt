import { PaymentType, Prisma as PrismaRuntime, type Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { getMockStore, mockAggregatePayments, mockFindPayments } from "../mock-store";

export class MockPaymentRepository {
  async findById(id: number, include?: Prisma.PaymentInclude) {
    const rows = mockFindPayments({ id }, { take: 1, include });
    return rows[0] ?? null;
  }

  async findMany(
    where: Prisma.PaymentWhereInput,
    options?: {
      skip?: number;
      take?: number;
      orderBy?: Prisma.PaymentOrderByWithRelationInput;
      include?: Prisma.PaymentInclude;
    },
  ) {
    return mockFindPayments(where, options);
  }

  async count(where: Prisma.PaymentWhereInput) {
    return mockFindPayments(where).length;
  }

  async create(data: Prisma.PaymentCreateInput) {
    const store = getMockStore();
    const id = store.nextId.payment++;
    const debtorId = typeof data.debtor === "object" && data.debtor.connect?.id ? data.debtor.connect.id : 0;
    const createdBy = typeof data.creator === "object" && data.creator.connect?.id ? data.creator.connect.id : 1;
    const amount = new PrismaRuntime.Decimal(Number(data.amount));
    const payment = {
      id,
      external_id: randomUUID(),
      debtor_id: debtorId,
      amount,
      payment_type: (data.payment_type as PaymentType) ?? PaymentType.CASH,
      note: (data.note as string | null) ?? null,
      created_at: data.created_at ? new Date(String(data.created_at)) : new Date(),
      created_by: createdBy,
    };
    store.payments.push(payment);
    const debtor = store.debtors.find((d) => d.id === debtorId);
    if (debtor) {
      debtor.total_debt = new PrismaRuntime.Decimal(Math.max(0, debtor.total_debt.toNumber() - amount.toNumber()));
      debtor.last_payment_date = payment.created_at;
      debtor.updated_at = new Date();
    }
    return payment;
  }

  async update(id: number, data: Prisma.PaymentUpdateInput) {
    const store = getMockStore();
    const idx = store.payments.findIndex((p) => p.id === id);
    if (idx < 0) throw new Error("Payment not found");
    const cur = store.payments[idx];
    const updated = {
      ...cur,
      amount: data.amount !== undefined ? new PrismaRuntime.Decimal(Number(data.amount)) : cur.amount,
      note: data.note !== undefined ? (data.note as string | null) : cur.note,
    };
    store.payments[idx] = updated;
    return updated;
  }

  async delete(id: number) {
    const store = getMockStore();
    store.payments = store.payments.filter((p) => p.id !== id);
    return { id };
  }

  async aggregate(where: Prisma.PaymentWhereInput) {
    return mockAggregatePayments(where);
  }
}

export const mockPaymentRepository = new MockPaymentRepository();
