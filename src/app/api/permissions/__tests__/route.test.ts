import { NextRequest } from "next/server";
import { GET, PATCH } from "../route";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/security/permission-access";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/auth", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/security/permission-access", () => ({ hasPermission: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    client: { findMany: jest.fn() },
    user: { findMany: jest.fn() },
    platformPermission: { findMany: jest.fn() },
    clientPermission: { findMany: jest.fn() },
    userPermission: { findMany: jest.fn() },
    $transaction: jest.fn(),
  },
}));

const session = { userId: 11, role: "ADMIN", clientId: 1 };
const req = (body: unknown) =>
  new NextRequest("http://localhost/api/permissions", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  jest.clearAllMocks();
  (getSession as jest.Mock).mockResolvedValue(session);
  (hasPermission as jest.Mock).mockResolvedValue(true);
});

it("never exposes a different shop to a shop admin", async () => {
  const response = await GET(new NextRequest("http://localhost/api/permissions?clientId=2"));
  expect(response.status).toBe(403);
  expect(prisma.user.findMany).not.toHaveBeenCalled();
});

it("does not let a shop admin change platform or another shop", async () => {
  for (const body of [
    { scope: "platform", changes: [{ key: "debtors.view", enabled: false }] },
    { scope: "user", clientId: 2, userId: 22, changes: [{ key: "debtors.view", enabled: true }] },
  ]) {
    expect((await PATCH(req(body))).status).toBe(403);
  }
  expect(prisma.$transaction).not.toHaveBeenCalled();
});

it("rejects unknown keys and duplicate changes before writing", async () => {
  for (const changes of [
    [{ key: "unknown.key", enabled: true }],
    [
      { key: "debtors.view", enabled: true },
      { key: "debtors.view", enabled: false },
    ],
  ]) {
    expect((await PATCH(req({ scope: "user", userId: 11, changes }))).status).toBe(403);
  }
  expect(prisma.$transaction).not.toHaveBeenCalled();
});

it("checks the acting user's manage permission", async () => {
  (hasPermission as jest.Mock).mockResolvedValue(false);
  const response = await PATCH(
    req({ scope: "user", userId: 11, changes: [{ key: "payments.create", enabled: true }] }),
  );
  expect(response.status).toBe(403);
  expect(prisma.$transaction).not.toHaveBeenCalled();
});

it("writes a same-shop grant and its audit record in one transaction", async () => {
  const tx = {
    $executeRaw: jest.fn(),
    client: { findUnique: jest.fn().mockResolvedValue({ is_active: true }) },
    user: { findFirst: jest.fn().mockResolvedValue({ id: 12, role: "USER" }) },
    platformPermission: { findUnique: jest.fn().mockResolvedValue(null) },
    clientPermission: { findUnique: jest.fn().mockResolvedValue(null) },
    userPermission: {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({}),
    },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
  };
  (prisma.$transaction as jest.Mock).mockImplementation((callback) => callback(tx));
  const response = await PATCH(
    req({
      scope: "user",
      clientId: 1,
      userId: 12,
      changes: [{ key: "payments.create", enabled: true }],
    }),
  );
  expect(response.status).toBe(200);
  expect(tx.user.findFirst).toHaveBeenCalledWith(
    expect.objectContaining({ where: expect.objectContaining({ client_id: 1 }) }),
  );
  expect(tx.userPermission.upsert).toHaveBeenCalledWith(
    expect.objectContaining({
      create: expect.objectContaining({ client_id: 1, user_id: 12, key: "payments.create" }),
    }),
  );
  expect(tx.auditLog.create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({ client_id: 1, user_id: 11, entity_type: "PERMISSION" }),
    }),
  );
});

it("rejects a grant when the shop has disabled that feature", async () => {
  const tx = {
    $executeRaw: jest.fn(),
    client: { findUnique: jest.fn().mockResolvedValue({ is_active: true }) },
    user: { findFirst: jest.fn().mockResolvedValue({ id: 12, role: "USER" }) },
    platformPermission: { findUnique: jest.fn().mockResolvedValue(null) },
    clientPermission: { findUnique: jest.fn().mockResolvedValue({ enabled: false }) },
    userPermission: { upsert: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  (prisma.$transaction as jest.Mock).mockImplementation((callback) => callback(tx));
  const response = await PATCH(
    req({
      scope: "user",
      userId: 12,
      changes: [{ key: "payments.create", enabled: true }],
    }),
  );
  expect(response.status).toBe(409);
  expect(tx.userPermission.upsert).not.toHaveBeenCalled();
  expect(tx.auditLog.create).not.toHaveBeenCalled();
});
