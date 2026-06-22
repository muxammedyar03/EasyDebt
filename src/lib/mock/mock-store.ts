import { Prisma as PrismaRuntime, type Prisma } from "@prisma/client";
import { createDemoMockStore, type MockStoreData } from "./seed-demo";

let _store: MockStoreData | null = null;

export function getMockStore(): MockStoreData {
  if (!_store) _store = createDemoMockStore();
  return _store;
}

export function resetMockStore(): void {
  _store = createDemoMockStore();
}

function inDateRange(date: Date, range: Prisma.DateTimeFilter | undefined): boolean {
  if (!range) return true;
  if (range.gte && date < range.gte) return false;
  if (range.lte && date > range.lte) return false;
  if (range.gt && date <= range.gt) return false;
  if (range.lt && date >= range.lt) return false;
  return true;
}

function matchDebtorWhere(d: MockStoreData["debtors"][0], where: Prisma.DebtorWhereInput): boolean {
  if (where.id !== undefined) {
    if (typeof where.id === "number" && d.id !== where.id) return false;
    if (typeof where.id === "object" && where.id !== null && "in" in where.id) {
      const inList = where.id.in;
      if (Array.isArray(inList) && !inList.includes(d.id)) return false;
    }
  }
  if (where.external_id !== undefined && d.external_id !== where.external_id) return false;
  if (where.is_overdue !== undefined && d.is_overdue !== where.is_overdue) return false;
  if (where.created_by !== undefined && d.created_by !== where.created_by) return false;
  return true;
}

function matchDateFilter(date: Date, filter: unknown): boolean {
  if (!filter) return true;
  if (filter instanceof Date) return date.getTime() === filter.getTime();
  if (typeof filter === "string") return true;
  if (typeof filter === "object") return inDateRange(date, filter as Prisma.DateTimeFilter);
  return true;
}

function matchDebtWhere(d: MockStoreData["debts"][0], where: Prisma.DebtWhereInput): boolean {
  if (where.id !== undefined && d.id !== where.id) return false;
  if (where.debtor_id !== undefined && d.debtor_id !== where.debtor_id) return false;
  if (where.created_at && !matchDateFilter(d.created_at, where.created_at)) return false;
  return true;
}

function matchPaymentWhere(p: MockStoreData["payments"][0], where: Prisma.PaymentWhereInput): boolean {
  if (where.id !== undefined && p.id !== where.id) return false;
  if (where.debtor_id !== undefined && p.debtor_id !== where.debtor_id) return false;
  if (where.created_at && !matchDateFilter(p.created_at, where.created_at)) return false;
  return true;
}

function matchReminderWhere(r: MockStoreData["paymentReminders"][0], where: Prisma.PaymentReminderWhereInput): boolean {
  if (where.id !== undefined && r.id !== where.id) return false;
  if (where.debtor_id !== undefined && r.debtor_id !== where.debtor_id) return false;
  if (where.status !== undefined && r.status !== where.status) return false;
  if (where.reminder_at && !matchDateFilter(r.reminder_at, where.reminder_at)) return false;
  return true;
}

function sortByCreatedAtDesc<T extends { created_at: Date }>(rows: T[]) {
  return [...rows].sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
}

function sortByIdAsc<T extends { id: number }>(rows: T[]) {
  return [...rows].sort((a, b) => a.id - b.id);
}

export function applyDebtorInclude(
  debtor: MockStoreData["debtors"][0],
  include?: Prisma.DebtorInclude,
  store = getMockStore(),
) {
  const row = { ...debtor };
  if (!include) return row;
  if (include.debts) {
    let debts = store.debts.filter((d) => d.debtor_id === debtor.id);
    if (typeof include.debts === "object" && include.debts.orderBy) {
      debts = sortByCreatedAtDesc(debts);
    }
    Object.assign(row, { debts });
  }
  if (include.payments) {
    let payments = store.payments.filter((p) => p.debtor_id === debtor.id);
    if (typeof include.payments === "object" && include.payments.orderBy) {
      payments = sortByCreatedAtDesc(payments);
    }
    Object.assign(row, { payments });
  }
  if (include.creator) {
    Object.assign(row, { creator: store.users.find((u) => u.id === debtor.created_by) ?? null });
  }
  return row;
}

export function mockSearchDebtorIds(searchTerms: string[], limit: number): number[] {
  const store = getMockStore();
  const terms = searchTerms.map((t) => t.toLowerCase());
  const matched = store.debtors.filter((d) =>
    terms.every((term) => {
      const digits = term.replace(/\D/g, "");
      return (
        d.first_name.toLowerCase().includes(term) ||
        d.last_name.toLowerCase().includes(term) ||
        (d.address?.toLowerCase().includes(term) ?? false) ||
        (digits.length > 0 && (d.phone_number?.replace(/\D/g, "").includes(digits) ?? false))
      );
    }),
  );
  return sortByCreatedAtDesc(matched)
    .slice(0, limit)
    .map((d) => d.id);
}

export function mockFindDebtors(
  where: Prisma.DebtorWhereInput,
  options?: {
    skip?: number;
    take?: number;
    orderBy?: Prisma.DebtorOrderByWithRelationInput;
    include?: Prisma.DebtorInclude;
  },
) {
  const store = getMockStore();
  let rows = store.debtors.filter((d) => matchDebtorWhere(d, where));
  if (options?.orderBy?.created_at === "desc") rows = sortByCreatedAtDesc(rows);
  else if (options?.orderBy?.id === "asc") rows = sortByIdAsc(rows);
  if (options?.skip) rows = rows.slice(options.skip);
  if (options?.take) rows = rows.slice(0, options.take);
  return rows.map((d) => applyDebtorInclude(d, options?.include, store));
}

export function mockFindDebts(
  where: Prisma.DebtWhereInput,
  options?: {
    skip?: number;
    take?: number;
    orderBy?: Prisma.DebtOrderByWithRelationInput;
    include?: Prisma.DebtInclude;
  },
) {
  const store = getMockStore();
  let rows = store.debts.filter((d) => matchDebtWhere(d, where));
  if (options?.orderBy?.created_at === "desc") rows = sortByCreatedAtDesc(rows);
  else if (options?.orderBy?.created_at === "asc") rows = sortByIdAsc(rows);
  if (options?.skip) rows = rows.slice(options.skip);
  if (options?.take) rows = rows.slice(0, options.take);
  return rows.map((d) => {
    const row = { ...d };
    if (options?.include?.debtor) {
      Object.assign(row, { debtor: store.debtors.find((x) => x.id === d.debtor_id) });
    }
    return row;
  });
}

export function mockFindPayments(
  where: Prisma.PaymentWhereInput,
  options?: {
    skip?: number;
    take?: number;
    orderBy?: Prisma.PaymentOrderByWithRelationInput;
    include?: Prisma.PaymentInclude;
  },
) {
  const store = getMockStore();
  let rows = store.payments.filter((p) => matchPaymentWhere(p, where));
  if (options?.orderBy?.created_at === "desc") rows = sortByCreatedAtDesc(rows);
  else if (options?.orderBy?.created_at === "asc") rows = sortByIdAsc(rows);
  if (options?.skip) rows = rows.slice(options.skip);
  if (options?.take) rows = rows.slice(0, options.take);
  return rows.map((p) => {
    const row = { ...p };
    if (options?.include?.debtor) {
      Object.assign(row, { debtor: store.debtors.find((x) => x.id === p.debtor_id) });
    }
    return row;
  });
}

export function mockFindReminders(
  where: Prisma.PaymentReminderWhereInput,
  options?: {
    skip?: number;
    take?: number;
    orderBy?: Prisma.PaymentReminderOrderByWithRelationInput;
    include?: Prisma.PaymentReminderInclude;
  },
) {
  const store = getMockStore();
  const include = options?.include ?? { debtor: true, creator: true };
  let rows = store.paymentReminders.filter((r) => matchReminderWhere(r, where));
  if (options?.orderBy?.reminder_at === "asc")
    rows = [...rows].sort((a, b) => a.reminder_at.getTime() - b.reminder_at.getTime());
  if (options?.skip) rows = rows.slice(options.skip);
  if (options?.take) rows = rows.slice(0, options.take);
  return rows.map((r) => {
    const row = { ...r };
    if (include?.debtor) {
      Object.assign(row, { debtor: store.debtors.find((d) => d.id === r.debtor_id) });
    }
    if (include?.creator) {
      Object.assign(row, { creator: store.users.find((u) => u.id === r.created_by) });
    }
    return row;
  });
}

export function mockAggregateDebtors(where: Prisma.DebtorWhereInput) {
  const rows = getMockStore().debtors.filter((d) => matchDebtorWhere(d, where));
  const sum = rows.reduce((s, d) => s + d.total_debt.toNumber(), 0);
  return { _sum: { total_debt: new PrismaRuntime.Decimal(sum) } };
}

export function mockAggregateDebts(where: Prisma.DebtWhereInput) {
  const rows = getMockStore().debts.filter((d) => matchDebtWhere(d, where));
  const sum = rows.reduce((s, d) => s + d.amount.toNumber(), 0);
  return { _sum: { amount: new PrismaRuntime.Decimal(sum) } };
}

export function mockAggregatePayments(where: Prisma.PaymentWhereInput) {
  const rows = getMockStore().payments.filter((p) => matchPaymentWhere(p, where));
  const sum = rows.reduce((s, p) => s + p.amount.toNumber(), 0);
  return { _sum: { amount: new PrismaRuntime.Decimal(sum) } };
}

export function mockFindUserByUsername(username: string) {
  return getMockStore().users.find((u) => u.username === username) ?? null;
}

export function mockVerifyPassword(plain: string, stored: string): boolean {
  return stored === `$mock$${plain}`;
}
