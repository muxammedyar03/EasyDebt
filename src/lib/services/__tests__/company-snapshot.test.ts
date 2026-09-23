import { Prisma } from "@prisma/client";
import { CompanyDailySnapshotService } from "../company-daily-snapshot.service";
jest.mock("@/lib/prisma", () => ({ prisma: {} }));
jest.mock("@/lib/mappers/company.mapper", () => ({ prismaToDomainCompanyDailySnapshot: (r: unknown) => r }));
it("derives historical balance from the ledger cutoff using exact decimals and the supplied transaction", async () => {
  const upsert = jest.fn(async (args) => args.create);
  const tx = {
    companyDebt: {
      aggregate: jest
        .fn()
        .mockResolvedValueOnce({ _sum: { amount: new Prisma.Decimal("100.10") } })
        .mockResolvedValueOnce({ _sum: { amount: new Prisma.Decimal("20.10") }, _count: 2 }),
    },
    companyPayment: {
      aggregate: jest
        .fn()
        .mockResolvedValueOnce({ _sum: { amount: new Prisma.Decimal("30.03") } })
        .mockResolvedValueOnce({ _sum: { amount: new Prisma.Decimal("10.01") }, _count: 1 }),
    },
    companyDailySnapshot: { upsert },
  };
  await new CompanyDailySnapshotService().refreshForDate(
    7,
    new Date("2026-01-10T12:00:00Z"),
    tx as unknown as Prisma.TransactionClient,
  );
  const data = upsert.mock.calls[0][0].create;
  expect(data.total_outstanding_debt.toString()).toBe("70.07");
  expect(data.debts_sum.toString()).toBe("20.1");
  expect(data.payments_count).toBe(1);
  expect(tx.companyDebt.aggregate.mock.calls[0][0].where.client_id).toBe(7);
  expect(tx.companyDebt.aggregate.mock.calls[0][0].where.created_at.lte.toISOString()).toBe("2026-01-10T18:59:59.999Z");
});

it("clamps one-month-ago reports to the previous month's last day", async () => {
  const service = new CompanyDailySnapshotService();
  const spy = jest.spyOn(service, "getSnapshotOn").mockResolvedValue({} as never);
  await service.getOutstandingOneMonthAgo(7, new Date("2026-03-31T12:00:00Z"));
  expect(spy).toHaveBeenCalledWith(7, new Date("2026-02-28T00:00:00Z"));
});
