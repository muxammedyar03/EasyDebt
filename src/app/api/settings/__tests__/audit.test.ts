import { NextRequest } from "next/server";
import { POST } from "../route";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { settingsRepository } from "@/entities/settings/api";
import { reEvaluateOverdueDebtors } from "@/lib/overdue-checker";

jest.mock("@/lib/auth", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/security/permissions", () => ({ can: jest.fn().mockReturnValue(true) }));
jest.mock("@/lib/prisma", () => ({ prisma: { $transaction: jest.fn() } }));
jest.mock("@/entities/settings/api", () => ({
  settingsRepository: { findByKey: jest.fn(), upsert: jest.fn() },
}));
jest.mock("@/lib/overdue-checker", () => ({ reEvaluateOverdueDebtors: jest.fn() }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

const request = () =>
  new NextRequest("http://localhost/api/settings", {
    method: "POST",
    body: JSON.stringify({ key: "overdue_days", value: "50" }),
  });

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getSession).mockResolvedValue({ userId: 4, username: "admin", role: "SUPER_ADMIN", clientId: 3 });
  jest.mocked(settingsRepository.findByKey).mockResolvedValue({ value: "45" } as never);
  jest
    .mocked(settingsRepository.upsert)
    .mockResolvedValue({ id: 8, client_id: 3, key: "overdue_days", value: "50" } as never);
});

it("writes the old and new setting in the same transaction and re-evaluates only after commit", async () => {
  const audit = jest.fn().mockResolvedValue({});
  const tx = { auditLog: { create: audit } };
  (prisma.$transaction as jest.Mock).mockImplementation(async (work) => work(tx));
  expect((await POST(request())).status).toBe(200);
  expect(settingsRepository.findByKey).toHaveBeenCalledWith(3, "overdue_days", tx);
  expect(settingsRepository.upsert).toHaveBeenCalledWith(3, "overdue_days", "50", tx);
  expect(audit).toHaveBeenCalledWith({
    data: expect.objectContaining({
      client_id: 3,
      entity_type: "SETTINGS",
      entity_id: 8,
      old_value: { key: "overdue_days", value: "45" },
      new_value: { key: "overdue_days", value: "50" },
    }),
  });
  expect(reEvaluateOverdueDebtors).toHaveBeenCalledWith(3);
});

it("rejects the mutation when audit storage fails without re-evaluating overdue status", async () => {
  const tx = { auditLog: { create: jest.fn().mockRejectedValue(new Error("audit unavailable")) } };
  (prisma.$transaction as jest.Mock).mockImplementation(async (work) => work(tx));
  const errorLog = jest.spyOn(console, "error").mockImplementation(() => {});
  try {
    expect((await POST(request())).status).toBe(500);
    expect(reEvaluateOverdueDebtors).not.toHaveBeenCalled();
  } finally {
    errorLog.mockRestore();
  }
});
