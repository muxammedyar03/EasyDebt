import { hasPermission } from "../permission-access";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    platformPermission: { findUnique: jest.fn() },
    clientPermission: { findUnique: jest.fn() },
    userPermission: { findUnique: jest.fn() },
  },
}));

const session = { userId: 11, clientId: 1, role: "ADMIN", username: "owner" };

beforeEach(() => {
  jest.resetAllMocks();
  (prisma.platformPermission.findUnique as jest.Mock).mockResolvedValue(null);
  (prisma.clientPermission.findUnique as jest.Mock).mockResolvedValue(null);
  (prisma.userPermission.findUnique as jest.Mock).mockResolvedValue(null);
});

it("requires a page grant for its action", async () => {
  (prisma.clientPermission.findUnique as jest.Mock).mockImplementation(({ where }) =>
    Promise.resolve(where.client_id_key.key === "debtors.view" ? { enabled: false } : null));
  expect(await hasPermission(session, "payments.create")).toBe(false);
});

it("ignores a grant attached to another tenant", async () => {
  (prisma.userPermission.findUnique as jest.Mock).mockResolvedValue({ enabled: true, client_id: 2 });
  expect(await hasPermission({ ...session, role: "USER" }, "users.view")).toBe(false);
});

it("reads revocations on every request, without relying on JWT content", async () => {
  expect(await hasPermission(session, "payments.create")).toBe(true);
  (prisma.userPermission.findUnique as jest.Mock).mockImplementation(({ where }) =>
    Promise.resolve(where.user_id_key.key === "payments.create" ? { enabled: false, client_id: 1 } : null));
  expect(await hasPermission(session, "payments.create")).toBe(false);
});
