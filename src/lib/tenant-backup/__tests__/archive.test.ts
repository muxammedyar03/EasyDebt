import { openBackup, sealBackup } from "../archive";
import { validateSnapshot } from "../service";
import { TENANT_BACKUP_TABLES } from "../tables";
jest.mock("@/lib/prisma", () => ({ prisma: {} }));
beforeEach(() => {
  process.env.TENANT_BACKUP_SECRET = "test-backup-only-01234567890123456789012345";
});
it("encrypts sensitive data and detects tampering", () => {
  const raw = { password: "private-hash", pin: "private-pin", phone: "private-phone" };
  const archive = sealBackup(raw);
  expect(archive).not.toContain("private");
  expect(openBackup(archive)).toEqual(raw);
  const changed = JSON.parse(archive);
  changed.tag = Buffer.alloc(16).toString("base64");
  expect(() => openBackup(JSON.stringify(changed))).toThrow();
});
it("rejects another shop, missing tables and platform privilege imports", () => {
  const data = {
    version: 1,
    id: "11111111-1111-4111-8111-111111111111",
    exportedAt: new Date().toISOString(),
    client: { id: 1, slug: "a", name: "A", is_active: true, created_at: "x", updated_at: "x" },
    tables: Object.fromEntries(TENANT_BACKUP_TABLES.map((t) => [t, []])) as Record<string, unknown[]>,
    receipts: [],
  };
  expect(() => validateSnapshot(data, 2)).toThrow("another shop");
  expect(() => validateSnapshot({ ...data, tables: {} }, 1)).toThrow("inventory");
  data.tables.users = [{ id: 1, client_id: 1, role: "SUPER_ADMIN" }];
  expect(() => validateSnapshot(data, 1)).toThrow("Platform accounts");
});
