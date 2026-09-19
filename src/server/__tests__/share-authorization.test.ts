import { generateShareTokenAction } from "../server-actions";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { signShareToken } from "@/lib/share-token";
jest.mock("@/lib/auth", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({ prisma: { debtor: { findFirst: jest.fn() } } }));
jest.mock("@/lib/share-token", () => ({ signShareToken: jest.fn().mockResolvedValue("signed") }));
const id = "11111111-1111-4111-8111-111111111111";
beforeEach(() => jest.clearAllMocks());
it("does not mint a token without a session", async () => {
  jest.mocked(getSession).mockResolvedValue(null);
  await expect(generateShareTokenAction(id)).rejects.toThrow("Unauthorized");
  expect(signShareToken).not.toHaveBeenCalled();
});
it("does not mint a token for tenant B's debtor", async () => {
  jest.mocked(getSession).mockResolvedValue({ userId: 1, username: "owner", role: "ADMIN", clientId: 1 });
  jest.mocked(prisma.debtor.findFirst).mockResolvedValue(null);
  await expect(generateShareTokenAction(id)).rejects.toThrow("Debtor not found");
  expect(prisma.debtor.findFirst).toHaveBeenCalledWith({
    where: { external_id: id, client_id: 1, client: { is_active: true } },
    select: { id: true },
  });
  expect(signShareToken).not.toHaveBeenCalled();
});
it("binds a permitted share to its tenant and issuer", async () => {
  jest.mocked(getSession).mockResolvedValue({ userId: 1, username: "owner", role: "ADMIN", clientId: 1 });
  jest.mocked(prisma.debtor.findFirst).mockResolvedValue({ id: 10 } as never);
  await expect(generateShareTokenAction(id)).resolves.toBe("signed");
  expect(signShareToken).toHaveBeenCalledWith(id, 1, 1);
});
