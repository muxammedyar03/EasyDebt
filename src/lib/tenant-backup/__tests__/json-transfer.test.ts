import { Prisma } from "@prisma/client";
import { exportJson, readJson } from "../json-transfer";
import { TENANT_BACKUP_TABLES } from "../tables";
import type { TenantSnapshot } from "../service";
jest.mock("@/lib/prisma", () => ({ prisma: {} }));
beforeEach(() => {
  process.env.TENANT_BACKUP_SECRET = "test-only-secret-012345678901234567890";
});
const snapshot = (): TenantSnapshot => ({
  version: 1,
  id: "11111111-1111-4111-8111-111111111111",
  exportedAt: new Date().toISOString(),
  client: { id: 1, slug: "shop", name: "Shop", is_active: true, created_at: "x", updated_at: "x" },
  tables: Object.fromEntries(TENANT_BACKUP_TABLES.map((t) => [t, []])),
  receipts: [],
});
it("covers every tenant model in the current Prisma schema", () => {
  const expected = Prisma.dmmf.datamodel.models
    .filter(
      (m) =>
        m.fields.some((f) => f.name === "client_id") || ["PushSubscription", "UserPushPreferences"].includes(m.name),
    )
    .map((m) => m.dbName ?? m.name);
  expect([...TENANT_BACKUP_TABLES].sort()).toEqual(expected.sort());
});
it("exports all tables including empty ones; authenticates content rather than metadata", () => {
  const data = snapshot();
  data.tables.users.push({ id: 1, client_id: 1, role: "ADMIN", password: "private-hash" });
  const json = exportJson(data, "admin");
  expect(Object.keys(json.meta.counts).sort()).toEqual([...TENANT_BACKUP_TABLES].sort());
  expect(JSON.stringify(json)).not.toContain("private-hash");
  expect(readJson(json, 1)).toEqual(data);
  json.meta.counts.users = 999;
  expect(readJson(json, 1).tables.users).toHaveLength(1);
  expect(() => readJson(json, 2)).toThrow("another shop");
});
it("refuses incomplete exports instead of silently dropping tables", () => {
  const data = snapshot();
  delete data.tables.notifications;
  expect(() => exportJson(data, "admin")).toThrow("inventory");
});
