import { NextRequest } from "next/server";
import { POST } from "../route";
import { getSession } from "@/lib/auth";
import { readJson } from "@/lib/tenant-backup/json-transfer";
import { restoreTenant, previewTenant } from "@/lib/tenant-backup/service";
import { takeSensitiveAttempt } from "@/lib/security/rate-limit";
import { BackupError } from "@/lib/tenant-backup/archive";
import bcrypt from "bcryptjs";
jest.mock("@/lib/auth", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: jest.fn(async () => ({ is_active: true, role: "ADMIN", password: "hash" })) } },
}));
jest.mock("@/lib/tenant-backup/json-transfer", () => ({ readJson: jest.fn() }));
jest.mock("@/lib/tenant-backup/service", () => ({ previewTenant: jest.fn(), restoreTenant: jest.fn() }));
jest.mock("@/lib/security/rate-limit", () => ({ takeSensitiveAttempt: jest.fn() }));
jest.mock("bcryptjs", () => ({ compare: jest.fn() }));
const req = (headers = {}) =>
  new NextRequest("http://localhost/api/debtors/import", {
    method: "POST",
    headers,
    body: JSON.stringify({ meta: { version: 2 }, archive: "sealed" }),
  });
beforeEach(() => {
  jest.resetAllMocks();
  (getSession as jest.Mock).mockResolvedValue({ userId: 1, clientId: 1, role: "ADMIN" });
  (readJson as jest.Mock).mockReturnValue({ id: "snapshot-id" });
  (previewTenant as jest.Mock).mockResolvedValue({
    counts: { debtors: 1, debts: 2, payments: 3 },
    backupId: "snapshot-id",
  });
  (takeSensitiveAttempt as jest.Mock).mockResolvedValue(true);
  (restoreTenant as jest.Mock).mockResolvedValue({ counts: { debtors: 0, debts: 1, payments: 0 } });
  (bcrypt.compare as jest.Mock).mockResolvedValue(true);
  const { prisma } = jest.requireMock("@/lib/prisma");
  prisma.user.findUnique.mockResolvedValue({ is_active: true, role: "ADMIN", password: "hash" });
});
it("previews all tables without applying an import", async () => {
  expect((await POST(req({ "x-import-action": "preview" }))).status).toBe(200);
  expect(restoreTenant).not.toHaveBeenCalled();
});
it("requires exact confirmation and password", async () => {
  expect((await POST(req())).status).toBe(400);
  (bcrypt.compare as jest.Mock).mockResolvedValue(false);
  expect((await POST(req({ "x-import-confirmation": "snapshot-id", "x-import-password": "wrong" }))).status).toBe(403);
  expect(restoreTenant).not.toHaveBeenCalled();
});
it("merges rather than replacing on confirmed JSON import", async () => {
  const response = await POST(req({ "x-import-confirmation": "snapshot-id", "x-import-password": "correct" }));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    success: true,
    counts: { debtors: 0, debts: 1, payments: 0 },
    debtorsCount: 0,
    debtsCount: 1,
    paymentsCount: 0,
  });
  expect(restoreTenant).toHaveBeenCalledWith({ id: "snapshot-id" }, 1, "merge");
});
it("rejects another shop before import", async () => {
  (readJson as jest.Mock).mockImplementation(() => {
    throw new BackupError("Another shop", 403);
  });
  expect((await POST(req())).status).toBe(403);
  expect(restoreTenant).not.toHaveBeenCalled();
});
it("rate limits password attempts", async () => {
  (takeSensitiveAttempt as jest.Mock).mockResolvedValue(false);
  expect((await POST(req({ "x-import-confirmation": "snapshot-id" }))).status).toBe(429);
  expect(restoreTenant).not.toHaveBeenCalled();
});
