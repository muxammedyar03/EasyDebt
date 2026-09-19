import { NextRequest } from "next/server";
import { POST } from "../route";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
