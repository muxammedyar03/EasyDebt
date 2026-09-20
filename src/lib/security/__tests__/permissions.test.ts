import { can } from "../permissions";
import { serializableTransaction } from "../serializable";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
jest.mock("@/lib/prisma", () => ({ prisma: { $transaction: jest.fn() } }));
it.each(["USER", "unknown"])("denies sensitive actions for %s", (role) => {
  const session = { userId: 1, username: "u", clientId: 1, role };
  expect(can(session, "settings.manage")).toBe(false);
  expect(can(session, "records.delete")).toBe(false);
  expect(can(session, "tenant.backup")).toBe(false);
});
it("retries serialization conflicts, not arbitrary failures", async () => {
  const conflict = new Prisma.PrismaClientKnownRequestError("conflict", { code: "P2034", clientVersion: "5" });
  (prisma.$transaction as jest.Mock).mockRejectedValueOnce(conflict).mockResolvedValueOnce(10);
  expect(await serializableTransaction(async () => 10)).toBe(10);
  expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "Serializable" });
  (prisma.$transaction as jest.Mock).mockReset().mockRejectedValue(new Error("not retryable"));
  await expect(serializableTransaction(async () => 10)).rejects.toThrow("not retryable");
  expect(prisma.$transaction).toHaveBeenCalledTimes(1);
});
