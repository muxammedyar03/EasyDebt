import type { Prisma } from "@prisma/client";
import { getMockStore, mockFindReminders } from "../mock-store";

type ReminderWithRelations = Prisma.PaymentReminderGetPayload<{
  include: { debtor: true; creator: true };
}>;

export class MockPaymentReminderRepository {
  async findById(id: number, include: Prisma.PaymentReminderInclude = { debtor: true, creator: true }) {
    const rows = mockFindReminders({ id }, { take: 1, include });
    return (rows[0] ?? null) as ReminderWithRelations | null;
  }

  async findFirst(
    where: Prisma.PaymentReminderWhereInput,
    options?: { orderBy?: Prisma.PaymentReminderOrderByWithRelationInput; include?: Prisma.PaymentReminderInclude },
  ) {
    const rows = mockFindReminders(where, { take: 1, ...options });
    return (rows[0] ?? null) as ReminderWithRelations | null;
  }

  async findMany(
    where: Prisma.PaymentReminderWhereInput,
    options?: {
      skip?: number;
      take?: number;
      orderBy?: Prisma.PaymentReminderOrderByWithRelationInput;
      include?: Prisma.PaymentReminderInclude;
    },
  ) {
    return mockFindReminders(where, options) as ReminderWithRelations[];
  }

  async count(where: Prisma.PaymentReminderWhereInput) {
    return mockFindReminders(where).length;
  }

  async create(
    data: Prisma.PaymentReminderCreateInput,
    include: Prisma.PaymentReminderInclude = { debtor: true, creator: true },
  ) {
    const store = getMockStore();
    const id = store.nextId.reminder++;
    const debtorId = typeof data.debtor === "object" && data.debtor.connect?.id ? data.debtor.connect.id : 0;
    const createdBy = typeof data.creator === "object" && data.creator.connect?.id ? data.creator.connect.id : 1;
    const now = new Date();
    const row = {
      id,
      debtor_id: debtorId,
      created_by: createdBy,
      reminder_at: new Date(String(data.reminder_at)),
      note: (data.note as string | null) ?? null,
      status: (data.status as "PENDING") ?? "PENDING",
      notified_at: null,
      created_at: now,
      updated_at: now,
    };
    store.paymentReminders.push(row);
    return mockFindReminders({ id }, { take: 1, include })[0] as ReminderWithRelations;
  }

  async update(
    id: number,
    data: Prisma.PaymentReminderUpdateInput,
    include: Prisma.PaymentReminderInclude = { debtor: true, creator: true },
  ) {
    const store = getMockStore();
    const idx = store.paymentReminders.findIndex((r) => r.id === id);
    if (idx < 0) throw new Error("Reminder not found");
    store.paymentReminders[idx] = {
      ...store.paymentReminders[idx],
      status: data.status !== undefined ? String(data.status) : store.paymentReminders[idx].status,
      note: data.note !== undefined ? (data.note as string | null) : store.paymentReminders[idx].note,
      updated_at: new Date(),
    } as (typeof store.paymentReminders)[0];
    return mockFindReminders({ id }, { take: 1, include })[0] as ReminderWithRelations;
  }

  async delete(id: number) {
    const store = getMockStore();
    store.paymentReminders = store.paymentReminders.filter((r) => r.id !== id);
    return { id };
  }

  async deleteMany(where: Prisma.PaymentReminderWhereInput) {
    const ids = mockFindReminders(where).map((r) => r.id);
    const store = getMockStore();
    store.paymentReminders = store.paymentReminders.filter((r) => !ids.includes(r.id));
    return { count: ids.length };
  }
}

export const mockPaymentReminderRepository = new MockPaymentReminderRepository();
