import { Prisma } from "@prisma/client";
import { CompanyPaymentService } from "@/lib/services/company-payment.service";
import { prisma } from "@/lib/prisma";
import { companyDailySnapshotService } from "@/lib/services/company-daily-snapshot.service";
jest.mock("@/lib/prisma", () => ({ prisma: { $transaction: jest.fn() } }));
jest.mock("@/lib/services/company-daily-snapshot.service", () => ({
  companyDailySnapshotService: { refreshAffectedDates: jest.fn() },
}));
jest.mock("@/lib/mappers/company.mapper", () => ({ prismaToDomainCompanyPayment: (v: unknown) => v }));
it("re-reads the committed amount after a concurrent edit and uses an exact decimal delta", async () => {
  const updateCompany = jest.fn();
  let attempt = 0;
  (prisma.$transaction as jest.Mock).mockImplementation(async (fn, options) => {
    expect(options.isolationLevel).toBe("Serializable");
    attempt++;
    const tx = {
      companyPayment: {
        findFirst: jest.fn().mockResolvedValue({
          id: 7,
          company_id: 2,
          amount: new Prisma.Decimal(attempt === 1 ? "10.10" : "20.20"),
          created_at: new Date("2026-01-01T20:00:00Z"),
        }),
        update: jest.fn().mockResolvedValue({ id: 7 }),
      },
      company: { update: updateCompany },
    };
    const result = await fn(tx);
    if (attempt === 1)
      throw new Prisma.PrismaClientKnownRequestError("concurrent write", { code: "P2034", clientVersion: "5" });
    return result;
  });
  await new CompanyPaymentService().update(1, 7, { amount: 30.3 });
  const last = updateCompany.mock.calls[1][0];
  expect(last.data.total_debt.decrement.toString()).toBe("10.1");
  expect(attempt).toBe(2);
  expect(companyDailySnapshotService.refreshAffectedDates).toHaveBeenLastCalledWith(
    1,
    new Date("2026-01-01T20:00:00Z"),
    expect.any(Object),
  );
});
