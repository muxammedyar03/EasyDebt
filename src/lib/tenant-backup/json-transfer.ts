import { z } from "zod";
import { sealBackup, openBackup } from "./archive";
import { validateSnapshot, type TenantSnapshot } from "./service";
import { TENANT_BACKUP_TABLES } from "./tables";

export const transferSchema = z
  .object({
    meta: z.object({ version: z.literal(2), format: z.literal("easydebt-full-json") }).passthrough(),
    archive: z.string(),
  })
  .strict();
export function exportJson(snapshot: TenantSnapshot, exportedBy: string) {
  validateSnapshot(snapshot, snapshot.client.id);
  return {
    meta: {
      version: 2,
      format: "easydebt-full-json",
      exportedBy,
      exportedAt: snapshot.exportedAt,
      debtorsCount: snapshot.tables.debtors.length,
      debtsCount: snapshot.tables.debts.length,
      paymentsCount: snapshot.tables.payments.length,
      counts: Object.fromEntries(TENANT_BACKUP_TABLES.map((t) => [t, snapshot.tables[t].length])),
      receipts: snapshot.receipts.length,
    },
    archive: sealBackup(snapshot),
  };
}
export function readJson(input: unknown, clientId: number) {
  const data = transferSchema.parse(input);
  // Only authenticated archive content is trusted; editable metadata is display-only.
  return validateSnapshot(openBackup(data.archive), clientId);
}
