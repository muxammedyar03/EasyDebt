import { computeDebtorOverdueStatus } from "@/entities/debtor/model/overdue";
const settings = { goodUntilDays: 30, mediumUntilDays: 45, minPaidPercent: 0.5 };
beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-09-20T12:00:00Z"));
});
afterEach(() => jest.useRealTimers());
it("counts each payment once across multiple debts", () => {
  const debts = [
    { amount: 100, createdAt: new Date("2026-01-01") },
    { amount: 100, createdAt: new Date("2026-01-02") },
  ];
  expect(
    computeDebtorOverdueStatus(debts, [{ amount: 100, createdAt: new Date("2026-01-03") }], settings).paidPercent,
  ).toBe(0.5);
});
it("respects a tiny checked payment and leaves unchecked payments overdue", () => {
  const debt = [{ amount: 10000, createdAt: new Date("2026-01-01") }];
  const payment = { amount: 1, createdAt: new Date(), resetsRating: true };
  const reset = computeDebtorOverdueStatus(debt, [payment], settings);
  expect(reset.overdueDays).toBe(0);
  expect(reset.isOverdue).toBe(false);
  expect(computeDebtorOverdueStatus(debt, [{ ...payment, resetsRating: false }], settings).isOverdue).toBe(true);
  jest.setSystemTime(new Date("2026-09-22T12:00:00Z"));
  expect(computeDebtorOverdueStatus(debt, [payment], settings).overdueDays).toBe(2);
});
