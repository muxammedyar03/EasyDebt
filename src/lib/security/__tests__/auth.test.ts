import { signToken, verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getJwtKey, getShareKey } from "../secrets";
jest.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique: jest.fn() }, client: { findFirst: jest.fn() } } }));
const initial = {
  id: 1,
  username: "owner",
  email: null,
  password: "hashed-password",
  role: "ADMIN",
  client_id: 1,
  is_active: true,
  updated_at: new Date("2026-01-01"),
  client: { is_active: true },
};
const claims = { userId: 1, username: "owner", role: "ADMIN", clientId: 1 };
beforeEach(() => {
  jest.mocked(prisma.user.findUnique).mockResolvedValue({ ...initial } as never);
  jest.mocked(prisma.client.findFirst).mockResolvedValue({ id: 1 } as never);
});
it("accepts an active current session", async () => {
  expect(await verifyToken(await signToken(claims))).toEqual({ ...claims, email: null });
});
it.each([
  { is_active: false },
  { client: { is_active: false } },
  { role: "USER" },
  { password: "changed-password" },
  { client_id: 2 },
  { updated_at: new Date("2026-02-01") },
])("rejects existing tokens after authoritative account change %j", async (change) => {
  const token = await signToken(claims);
  jest.mocked(prisma.user.findUnique).mockResolvedValue({ ...initial, ...change } as never);
  expect(await verifyToken(token)).toBeNull();
});
it("rejects a disabled effective tenant", async () => {
  const token = await signToken(claims);
  jest.mocked(prisma.client.findFirst).mockResolvedValue(null);
  expect(await verifyToken(token)).toBeNull();
});
it("does not let normal users sign for another tenant", async () => {
  await expect(signToken({ ...claims, clientId: 2 })).rejects.toThrow("Forbidden tenant");
});
it("allows a current superadmin to select an active tenant", async () => {
  jest.mocked(prisma.user.findUnique).mockResolvedValue({ ...initial, role: "SUPER_ADMIN" } as never);
  jest.mocked(prisma.client.findFirst).mockResolvedValue({ id: 2 } as never);
  const token = await signToken({ ...claims, clientId: 2 });
  expect(await verifyToken(token)).toMatchObject({ clientId: 2, role: "SUPER_ADMIN" });
});
it("rejects missing/default secrets and derives a distinct share key", async () => {
  const original = process.env.JWT_SECRET;
  try {
    delete process.env.JWT_SECRET;
    expect(getJwtKey).toThrow();
    process.env.JWT_SECRET = "your-secret-key-change-this-in-production";
    expect(getJwtKey).toThrow();
    process.env.JWT_SECRET = original;
    expect(Buffer.from(await getShareKey()).equals(Buffer.from(getJwtKey()))).toBe(false);
  } finally {
    process.env.JWT_SECRET = original;
  }
});
