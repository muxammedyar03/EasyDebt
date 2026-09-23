import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { POST } from "../route";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { refreshDebtorStatus } from "@/lib/security/refresh-debtor-status";

jest.mock("@/lib/auth", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({ prisma: { user: { findFirst: jest.fn() }, $transaction: jest.fn() } }));
jest.mock("@/lib/security/refresh-debtor-status", () => ({ refreshDebtorStatus: jest.fn() }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

const payload = { debtor_id: 11, amount: 20, payment_type: "CASH", resets_rating: true };
const key = "11111111-1111-4111-8111-111111111111";
const debtor = {
  id: 11,
  external_id: "debtor-11",
  first_name: "Test",
  last_name: "Buyer",
  phone_number: null,
  total_debt: new Prisma.Decimal(100),
};
const tx = {
  debtor: { findFirst: jest.fn(), update: jest.fn() },
  payment: { findFirst: jest.fn(), create: jest.fn() },
  auditLog: { findFirst: jest.fn(), create: jest.fn() },
};

function request(body: object = payload, requestKey = key) {
  return new NextRequest("http://localhost/api/payments", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Idempotency-Key": requestKey },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getSession).mockResolvedValue({ userId: 2, username: "cashier", role: "USER", clientId: 7 });
  jest
    .mocked(prisma.user.findFirst)
    .mockResolvedValue({ username: "cashier", first_name: null, last_name: null } as never);
  (prisma.$transaction as jest.Mock).mockImplementation((fn) => fn(tx));
  tx.debtor.findFirst.mockResolvedValue(debtor);
  tx.payment.findFirst.mockResolvedValue(null);
  tx.payment.create.mockResolvedValue({
    id: 15,
    debtor_id: 11,
    amount: new Prisma.Decimal(20),
    payment_type: "CASH",
    note: null,
    resets_rating: true,
    created_at: new Date("2026-01-01T00:00:00Z"),
  });
  tx.auditLog.create.mockResolvedValue({});
  jest.mocked(refreshDebtorStatus).mockResolvedValue({ total_debt: new Prisma.Decimal(80) } as never);
});

it("replays a payment and receipt without double charging or duplicating the audit", async () => {
  const first = await POST(request());
  expect(first.status).toBe(201);
  const receipt = await first.json();
  const recorded = tx.payment.create.mock.calls[0][0].data;
  expect(recorded).toEqual(expect.objectContaining({ client_id: 7, debtor_id: 11, resets_rating: true }));
  expect(tx.auditLog.create).toHaveBeenCalledWith({
    data: expect.objectContaining({
      client_id: 7,
      entity_id: 15,
      new_value: expect.objectContaining({ previousBalance: 100, newBalance: 80 }),
    }),
  });

  tx.payment.findFirst.mockResolvedValue({
    ...recorded,
    id: 15,
    amount: new Prisma.Decimal(20),
    debtor,
    created_at: new Date(),
  });
  tx.auditLog.findFirst.mockResolvedValue({ new_value: { previousBalance: 100, newBalance: 80 } });
  const second = await POST(request());
  expect(second.status).toBe(201);
  expect(await second.json()).toMatchObject({ id: receipt.id, previousBalance: 100, newBalance: 80 });
  expect(tx.payment.create).toHaveBeenCalledTimes(1);
  expect(tx.debtor.update).toHaveBeenCalledTimes(1);
  expect(tx.auditLog.create).toHaveBeenCalledTimes(1);
  expect(tx.payment.findFirst).toHaveBeenCalledWith({
    where: { external_id: recorded.external_id, client_id: 7 },
    include: { debtor: true },
  });
});

it("rejects key reuse with a different amount before any write", async () => {
  tx.payment.findFirst.mockResolvedValue({
    debtor_id: 11,
    amount: new Prisma.Decimal(20),
    payment_type: "CASH",
    note: null,
    resets_rating: true,
    created_at: new Date(),
    debtor,
  });
  const response = await POST(request({ ...payload, amount: 30 }));
  expect(response.status).toBe(409);
  expect(tx.payment.create).not.toHaveBeenCalled();
  expect(tx.debtor.update).not.toHaveBeenCalled();
});

it("isolates keys by tenant and actor", async () => {
  await POST(request());
  const first = tx.payment.create.mock.calls[0][0].data.external_id;
  jest.mocked(getSession).mockResolvedValue({ userId: 3, username: "other", role: "USER", clientId: 8 });
  await POST(request());
  const second = tx.payment.create.mock.calls[1][0].data.external_id;
  expect(first).not.toBe(second);
  expect(tx.debtor.findFirst).toHaveBeenLastCalledWith({ where: { id: 11, client_id: 8 } });
});

it("rejects malformed keys before any DB work", async () => {
  expect((await POST(request(payload, "invalid"))).status).toBe(400);
  expect(prisma.$transaction).not.toHaveBeenCalled();
});

it("does not acknowledge a payment when its audit write fails", async () => {
  tx.auditLog.create.mockRejectedValueOnce(new Error("audit storage unavailable"));
  const errorLog = jest.spyOn(console, "error").mockImplementation(() => {});
  try {
    const response = await POST(request());
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Serverda xatolik yuz berdi" });
    expect(tx.auditLog.create).toHaveBeenCalledTimes(1);
  } finally {
    errorLog.mockRestore();
  }
});
