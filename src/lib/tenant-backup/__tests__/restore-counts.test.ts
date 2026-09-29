import { prisma } from "@/lib/prisma";
import { restoreTenant, type TenantSnapshot } from "../service";
import { TENANT_BACKUP_TABLES } from "../tables";

jest.mock("@/lib/prisma", () => ({ prisma: { $transaction: jest.fn() } }));

const snapshot: TenantSnapshot = {
  version: 1,
  id: "11111111-1111-4111-8111-111111111111",
  exportedAt: "2026-09-29T00:00:00.000Z",
  client: { id: 1, slug: "shop", name: "Shop", is_active: true, created_at: "x", updated_at: "x" },
  tables: {
    ...Object.fromEntries(TENANT_BACKUP_TABLES.map((table) => [table, []])),
    users: [{ id: 3, client_id: 1, role: "ADMIN" }],
    debtors: [{ id: 7, client_id: 1, created_by: 3 }],
  },
  receipts: [],
};

it("reports actual inserted rows rather than the snapshot size on repeat merge", async () => {
  let firstImport = true;
  const audit = jest.fn().mockResolvedValue({});
  (prisma.$transaction as jest.Mock).mockImplementation(async (work) => {
    let preflightQuery = 0;
    const tx = {
      client: { findUniqueOrThrow: jest.fn().mockResolvedValue({ slug: "shop" }) },
      $queryRaw: jest.fn().mockImplementation(async () => {
        const index = preflightQuery++;
        if (index === 0) return Object.keys(snapshot.tables.users[0]).map((column_name) => ({ column_name }));
        if (index === 2) return Object.keys(snapshot.tables.debtors[0]).map((column_name) => ({ column_name }));
        return [];
      }),
      $executeRaw: jest.fn().mockImplementation(async (query) => {
        if (query.strings?.[0]?.startsWith("INSERT INTO")) return firstImport ? 1 : 0;
        return 0;
      }),
      $executeRawUnsafe: jest.fn().mockResolvedValue(0),
      auditLog: { create: audit },
    };
    return work(tx);
  });

  const first = await restoreTenant(snapshot, 3, "merge");
  expect(first.counts.users).toBe(1);
  expect(first.counts.debtors).toBe(1);
  expect(first.counts.payments).toBe(0);

  firstImport = false;
  const repeat = await restoreTenant(snapshot, 3, "merge");
  expect(repeat.counts.users).toBe(0);
  expect(repeat.counts.debtors).toBe(0);
  expect(audit).toHaveBeenCalledTimes(2);
  expect(audit).toHaveBeenLastCalledWith({
    data: expect.objectContaining({
      action: "RESTORE",
      new_value: { snapshot_id: snapshot.id, inserted_counts: repeat.counts },
    }),
  });
});
