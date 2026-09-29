import { NextRequest } from "next/server";
import { POST } from "../route";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
jest.mock("@/lib/auth", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({ prisma: { $transaction: jest.fn(), importHistory: { findFirst: jest.fn() } } }));
const payload = {
  meta: { version: 1 },
  debtors: [
    {
      external_id: "11111111-1111-4111-8111-111111111111",
      first_name: "B",
      last_name: "Owner",
      debts: [],
      payments: [],
    },
  ],
};
const request = () =>
  new NextRequest("http://localhost/api/debtors/import", { method: "POST", body: JSON.stringify(payload) });
beforeEach(() => {
  jest.clearAllMocks();
});
it("denies unauthenticated imports before DB access", async () => {
  jest.mocked(getSession).mockResolvedValue(null);
  expect((await POST(request())).status).toBe(401);
  expect(prisma.$transaction).not.toHaveBeenCalled();
});
it("denies USER imports before DB access", async () => {
  jest.mocked(getSession).mockResolvedValue({ userId: 1, username: "cashier", role: "USER", clientId: 1 });
  expect((await POST(request())).status).toBe(403);
  expect(prisma.$transaction).not.toHaveBeenCalled();
});
it("rejects a foreign debtor before ANY mutation and hides its ownership", async () => {
  jest.mocked(getSession).mockResolvedValue({ userId: 1, username: "admin", role: "ADMIN", clientId: 1 });
  jest.mocked(prisma.importHistory.findFirst).mockResolvedValue(null);
  const write = jest.fn();
  const tx = {
    debtor: {
      findMany: jest.fn().mockResolvedValue([{ external_id: payload.debtors[0].external_id, client_id: 2 }]),
      update: write,
      create: write,
    },
    debt: { findMany: jest.fn().mockResolvedValue([]), createMany: write },
    payment: { findMany: jest.fn().mockResolvedValue([]), createMany: write },
    importHistory: { create: write },
    auditLog: { create: write },
  };
  (prisma.$transaction as jest.Mock).mockImplementation((fn) => fn(tx));
  const response = await POST(request());
  expect(response.status).toBe(409);
  expect(await response.json()).toEqual({ error: "Import identifiers conflict with existing records" });
  expect(write).not.toHaveBeenCalled();
  expect(prisma.importHistory.findFirst).toHaveBeenCalledWith(
    expect.objectContaining({ where: expect.objectContaining({ client_id: 1, status: "SUCCESS" }) }),
  );
});
it("preserves the latest historical payment date and exact balance on import", async () => {
  jest.mocked(getSession).mockResolvedValue({ userId: 1, username: "admin", role: "ADMIN", clientId: 1 });
  jest.mocked(prisma.importHistory.findFirst).mockResolvedValue(null);
  const paidAt = new Date("2024-02-01T00:00:00.000Z");
  const tx = {
    debtor: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: 7 }),
      update: jest.fn().mockResolvedValue({}),
    },
    debt: {
      findMany: jest.fn().mockResolvedValue([]),
      createMany: jest.fn().mockResolvedValue({ count: 1 }),
      groupBy: jest.fn().mockResolvedValue([{ debtor_id: 7, _sum: { amount: new Prisma.Decimal("0.3") } }]),
    },
    payment: {
      findMany: jest.fn().mockResolvedValue([]),
      createMany: jest.fn().mockResolvedValue({ count: 1 }),
      groupBy: jest
        .fn()
        .mockResolvedValueOnce([{ debtor_id: 7, _sum: { amount: new Prisma.Decimal("0.1") } }])
        .mockResolvedValueOnce([{ debtor_id: 7, _max: { created_at: paidAt } }]),
    },
    importHistory: { create: jest.fn().mockResolvedValue({}) },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
  };
  (prisma.$transaction as jest.Mock).mockImplementation((fn) => fn(tx));
  const response = await POST(
    new NextRequest("http://localhost/api/debtors/import", {
      method: "POST",
      body: JSON.stringify({
        meta: { version: 1 },
        debtors: [
          {
            ...payload.debtors[0],
            debts: [
              {
                external_id: "22222222-2222-4222-8222-222222222222",
                amount: 0.3,
                created_at: "2024-01-01T00:00:00.000Z",
              },
            ],
            payments: [
              {
                external_id: "33333333-3333-4333-8333-333333333333",
                amount: 0.1,
                payment_type: "CASH",
                created_at: paidAt.toISOString(),
              },
            ],
          },
        ],
      }),
    }),
  );
  expect(response.status).toBe(200);
  expect(tx.debtor.update).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({ last_payment_date: paidAt }),
    }),
  );
  const balance = tx.debtor.update.mock.calls.at(-1)?.[0].data.total_debt;
  expect(balance.toString()).toBe("0.2");
  expect(tx.importHistory.create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({ debtors_count: 1, debts_count: 1, payments_count: 1 }),
    }),
  );
});
