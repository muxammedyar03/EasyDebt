import { ReportsService } from "../reports.service";
import { prisma } from "@/lib/prisma";
import { parseReportQuery } from "@/lib/report-query";
jest.mock("@/lib/prisma", () => ({ prisma: { $transaction: jest.fn() } }));
const transaction = prisma.$transaction as jest.Mock;
afterEach(() => jest.clearAllMocks());
it("clamps pages using complete counts and reads all results from one repeatable snapshot", async () => {
  const raw = jest
    .fn()
    .mockResolvedValueOnce([
      {
        payments_count: 2501,
        debts_count: 0,
        total_payments: "250.10",
        total_debts: "0",
        cash: "250.10",
        card: "0",
        click: "0",
      },
    ])
    .mockResolvedValue([]);
  transaction.mockImplementation(async (cb) => cb({ $queryRawUnsafe: raw }));
  const result = await new ReportsService().getDashboardReport(
    7,
    parseReportQuery({ date: "2026-01-10", paymentsPage: "999" }),
  );
  expect(result.query.paymentsPage).toBe(51);
  expect(result.totals.total_payments).toBe("250.10");
  expect(raw.mock.calls[1].slice(-3)).toEqual(["payment", 50, 2500]);
  expect(transaction.mock.calls[0][1].isolationLevel).toBe("RepeatableRead");
  for (const call of raw.mock.calls) expect(call[1]).toBe(7);
});
it("stops the export when its consumer cancels", async () => {
  const raw = jest.fn().mockResolvedValue([{ kind: "payment", id: 1, created_at: new Date() }]);
  transaction.mockImplementation(async (cb) => cb({ $queryRawUnsafe: raw }));
  await expect(
    new ReportsService().exportReport(7, parseReportQuery({}), async () => {
      throw new Error("cancelled");
    }),
  ).rejects.toThrow("cancelled");
  expect(raw).toHaveBeenCalledTimes(1);
});
it("refuses a missing tenant before database access", async () => {
  await expect(new ReportsService().getDashboardReport(0, parseReportQuery({}))).rejects.toThrow("Client context");
  expect(transaction).not.toHaveBeenCalled();
});
