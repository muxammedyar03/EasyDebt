import { activeLedgerEntries } from "../active-ledger";
import { computeDebtorOverdueStatus } from "@/entities/debtor/model/overdue";

const settings = { goodUntilDays: 30, mediumUntilDays: 45, minPaidPercent: 0.5 };

describe("cancelled ledger pairs", () => {
  beforeEach(() => { jest.useFakeTimers().setSystemTime(new Date("2026-09-30T12:00:00Z")); });
  afterEach(() => { jest.useRealTimers(); });

  it("keeps a cancelled old debt out of overdue aging", () => {
    const entries = [
      { id: 1, reverses_debt_id: null, amount: 100, createdAt: new Date("2026-01-01") },
      { id: 2, reverses_debt_id: 1, amount: -100, createdAt: new Date("2026-09-30") },
      { id: 3, reverses_debt_id: null, amount: 50, createdAt: new Date("2026-09-29") },
    ];
    const active = activeLedgerEntries(entries, (entry) => entry.reverses_debt_id);
    expect(active.map((entry) => entry.id)).toEqual([3]);
    expect(computeDebtorOverdueStatus(active.map((entry) => ({ amount: entry.amount, createdAt: entry.createdAt })), [], settings).isOverdue).toBe(false);
    expect(entries.reduce((sum, entry) => sum + entry.amount, 0)).toBe(50);
  });

  it("removes a cancelled rating reset and keeps the net balance", () => {
    const entries = [
      { id: 8, reverses_payment_id: null, amount: 10, createdAt: new Date("2026-09-29"), resetsRating: true },
      { id: 9, reverses_payment_id: 8, amount: -10, createdAt: new Date("2026-09-30"), resetsRating: false },
    ];
    const active = activeLedgerEntries(entries, (entry) => entry.reverses_payment_id);
    expect(active).toEqual([]);
    expect(computeDebtorOverdueStatus([{ amount: 100, createdAt: new Date("2026-01-01") }], active, settings).isOverdue).toBe(true);
    expect(entries.reduce((sum, entry) => sum + entry.amount, 0)).toBe(0);
  });
});
