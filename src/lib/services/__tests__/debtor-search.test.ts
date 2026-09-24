import { Prisma } from "@prisma/client";
import { DebtorService } from "../debtor.service";
import { debtorRepository } from "@/entities/debtor/api";
jest.mock("@/entities/debtor/api", () => ({ debtorRepository: { withListReader: jest.fn() } }));
jest.mock("@/entities/debt/api", () => ({ debtRepository: {} }));
jest.mock("@/entities/payment/api", () => ({ paymentRepository: {} }));
jest.mock("@/entities/settings/api", () => ({
  settingsRepository: { getDebtLimit: async () => 1000, getOverdueDays: async () => 45 },
}));
const withReader = debtorRepository.withListReader as jest.Mock;
const service = new DebtorService();
function row(id: number, reset = false) {
  return {
    id,
    client_id: 7,
    external_id: `debtor-${id}`,
    first_name: "Ali",
    last_name: "Valiyev",
    phone_number: null,
    address: null,
    total_debt: new Prisma.Decimal(99),
    is_overdue: reset,
    last_payment_date: null,
    created_at: new Date("2026-01-01"),
    updated_at: new Date("2026-01-01"),
    created_by: 70,
    debts: [{ id, amount: new Prisma.Decimal(100), created_at: new Date("2026-01-01") }],
    payments: reset
      ? [{ id, amount: new Prisma.Decimal(1), created_at: new Date("2026-09-24"), resets_rating: true }]
      : [],
  };
}
beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-09-24T12:00:00Z"));
});
afterEach(() => jest.useRealTimers());
it("keeps search, status, sort and page while returning exact total", async () => {
  const read = jest.fn().mockResolvedValue([row(11)]);
  withReader.mockImplementation(async (_client, _filters, _sort, consume) => consume({ count: async () => 270, read }));
  const filters = { search: "ali", status: "paid_off" as const, minDebt: 0, createdBy: 70 };
  const pagination = { page: 2, limit: 10, sortBy: "name", sortOrder: "asc" as const };
  const result = await service.findMany(7, filters, pagination);
  expect(withReader.mock.calls[0].slice(0, 3)).toEqual([7, filters, pagination]);
  expect(read).toHaveBeenCalledWith(10, 10);
  expect(result).toMatchObject({ total: 270, page: 2, limit: 10, totalPages: 27 });
});
it("filters ledger-derived overdue before pagination, honoring rating reset", async () => {
  const rows = Array.from({ length: 301 }, (_, i) => row(i + 1, i % 2 === 0));
  const read = jest.fn(async (skip, take) => rows.slice(skip, skip + take));
  withReader.mockImplementation(async (_client, _filters, _sort, consume) => consume({ count: jest.fn(), read }));
  const result = await service.findMany(7, { search: "ali", isOverdue: true }, { page: 2, limit: 10 });
  expect(result.total).toBe(150);
  expect(result.data.map((d) => d.id)).toEqual([22, 24, 26, 28, 30, 32, 34, 36, 38, 40]);
  expect(read.mock.calls).toEqual([
    [0, 100],
    [100, 100],
    [200, 100],
    [300, 100],
  ]);
  const active = await service.findMany(7, { search: "ali", status: "active" }, { page: 1, limit: 10 });
  expect(active.total).toBe(151);
  expect(active.data.every((d) => !d.isOverdue)).toBe(true);
});
it("keeps page metadata on no results, clamps bad pages and handles contradictory statuses", async () => {
  withReader.mockImplementation(async (_client, _filters, _sort, consume) =>
    consume({ count: async () => 0, read: async () => [] }),
  );
  expect(await service.findMany(7, { search: "none" }, { page: 2, limit: 10 })).toMatchObject({
    data: [],
    page: 2,
    total: 0,
    totalPages: 0,
  });
  expect(await service.findMany(7, {}, { page: -1, limit: 100000 })).toMatchObject({ page: 1, limit: 250 });
  expect(await service.findMany(7, { status: "active", isOverdue: true }, { page: 1, limit: 10 })).toMatchObject({
    data: [],
    total: 0,
  });
});
