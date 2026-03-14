/**
 * Unit tests for fetchDebtorById and normalizeDebtorFromApi (date string → Date).
 */

import { fetchDebtorById, normalizeDebtorFromApi } from "../fetch-debtor";

describe("normalizeDebtorFromApi", () => {
  it("converts string dates to Date objects", () => {
    const created = "2025-03-01T10:00:00.000Z";
    const updated = "2025-03-02T12:00:00.000Z";
    const raw = {
      id: 1,
      externalId: "ext-1",
      firstName: "Test",
      lastName: "User",
      phoneNumber: null,
      address: null,
      totalDebt: 1000,
      isOverdue: false,
      lastPaymentDate: null,
      riskStatus: "low",
      status: "active",
      daysOverdue: null,
      createdAt: created,
      updatedAt: updated,
      createdBy: 1,
      debts: [
        {
          id: 1,
          amount: 500,
          createdAt: "2025-02-15T00:00:00.000Z",
          debtorId: 1,
          externalId: "d1",
          description: null,
          items: null,
          createdBy: 1,
        },
      ],
      payments: [
        {
          id: 1,
          amount: 200,
          createdAt: "2025-02-20T00:00:00.000Z",
          debtorId: 1,
          externalId: "p1",
          paymentType: "CASH",
          note: null,
          createdBy: 1,
        },
      ],
    };
    const result = normalizeDebtorFromApi(raw as Record<string, unknown>);
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.updatedAt).toBeInstanceOf(Date);
    expect(result.createdAt.toISOString()).toBe(created);
    expect(result.updatedAt.toISOString()).toBe(updated);
    expect(result.debts).toHaveLength(1);
    expect(result.debts![0].createdAt).toBeInstanceOf(Date);
    expect(result.payments).toHaveLength(1);
    expect(result.payments![0].createdAt).toBeInstanceOf(Date);
  });

  it("handles already Date objects (no double conversion)", () => {
    const created = new Date("2025-03-01");
    const raw = {
      id: 1,
      externalId: "e1",
      firstName: "A",
      lastName: "B",
      phoneNumber: null,
      address: null,
      totalDebt: 0,
      isOverdue: false,
      lastPaymentDate: null,
      riskStatus: "low",
      status: "active",
      daysOverdue: null,
      createdAt: created,
      updatedAt: created,
      createdBy: 1,
      debts: [],
      payments: [],
    };
    const result = normalizeDebtorFromApi(raw as Record<string, unknown>);
    expect(result.createdAt).toBe(created);
    expect(result.updatedAt).toBe(created);
  });

  it("handles missing debts and payments", () => {
    const raw = {
      id: 1,
      externalId: "e1",
      firstName: "A",
      lastName: "B",
      phoneNumber: null,
      address: null,
      totalDebt: 0,
      isOverdue: false,
      lastPaymentDate: null,
      riskStatus: "low",
      status: "active",
      daysOverdue: null,
      createdAt: "2025-03-01T00:00:00.000Z",
      updatedAt: "2025-03-01T00:00:00.000Z",
      createdBy: 1,
    };
    const result = normalizeDebtorFromApi(raw as Record<string, unknown>);
    expect(result.debts).toEqual([]);
    expect(result.payments).toEqual([]);
  });

  it("converts lastPaymentDate string to Date when present", () => {
    const raw = {
      id: 1,
      externalId: "e1",
      firstName: "A",
      lastName: "B",
      phoneNumber: null,
      address: null,
      totalDebt: 0,
      isOverdue: false,
      lastPaymentDate: "2025-02-28T00:00:00.000Z",
      riskStatus: "low",
      status: "active",
      daysOverdue: null,
      createdAt: "2025-03-01T00:00:00.000Z",
      updatedAt: "2025-03-01T00:00:00.000Z",
      createdBy: 1,
      debts: [],
      payments: [],
    };
    const result = normalizeDebtorFromApi(raw as Record<string, unknown>);
    expect(result.lastPaymentDate).toBeInstanceOf(Date);
    expect((result.lastPaymentDate as Date).toISOString()).toBe("2025-02-28T00:00:00.000Z");
  });
});

describe("fetchDebtorById", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns normalized debtor when response is ok", async () => {
    const createdAt = "2025-03-01T00:00:00.000Z";
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: 1,
          externalId: "e1",
          firstName: "John",
          lastName: "Doe",
          phoneNumber: null,
          address: null,
          totalDebt: 500,
          isOverdue: false,
          lastPaymentDate: null,
          riskStatus: "low",
          status: "active",
          daysOverdue: null,
          createdAt,
          updatedAt: createdAt,
          createdBy: 1,
          debts: [],
          payments: [],
        }),
    });
    const result = await fetchDebtorById(1);
    expect(result.id).toBe(1);
    expect(result.firstName).toBe("John");
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(globalThis.fetch).toHaveBeenCalledWith("/api/debtors/1");
  });

  it("throws when response is not ok", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Not found" }),
    });
    await expect(fetchDebtorById(99)).rejects.toThrow("Not found");
  });

  it("throws generic message when response has no error body", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.reject(new Error("parse error")),
    });
    await expect(fetchDebtorById(99)).rejects.toThrow("Qarzdorni yuklashda xatolik");
  });
});
