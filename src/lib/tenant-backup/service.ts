import { Prisma } from "@prisma/client";
import { createHash, randomUUID } from "crypto";
import { readFile, writeFile, mkdir, unlink, stat } from "fs/promises";
import path from "path";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCompanyReceiptAbsolutePath } from "@/lib/companies/receipt-storage";
import { BackupError, MAX_BACKUP_BYTES } from "./archive";
import { APPEND_ONLY, MONEY_COLUMNS, TENANT_BACKUP_TABLES, USER_SCOPED, type BackupTable } from "./tables";

const rowSchema = z.record(z.unknown());
const snapshotSchema = z
  .object({
    version: z.literal(1),
    id: z.string().uuid(),
    exportedAt: z.string().datetime(),
    client: z
      .object({
        id: z.number().int().positive(),
        slug: z.string(),
        name: z.string(),
        is_active: z.boolean(),
        created_at: z.string(),
        updated_at: z.string(),
      })
      .strict(),
    tables: z.record(z.array(rowSchema)),
    receipts: z.array(
      z
        .object({
          paymentId: z.number().int().positive(),
          sha256: z.string().regex(/^[a-f0-9]{64}$/),
          data: z.string(),
        })
        .strict(),
    ),
  })
  .strict();
export type TenantSnapshot = z.infer<typeof snapshotSchema>;

function scope(table: BackupTable, clientId: number) {
  if (table === "push_deliveries")
    return Prisma.sql`r.client_id=${clientId} AND r.subscription_id IN (SELECT s.id FROM push_subscriptions s JOIN users u ON u.id=s.user_id WHERE u.client_id=${clientId} AND u.role <> 'SUPER_ADMIN')`;
  return USER_SCOPED.has(table)
    ? Prisma.sql`r.user_id IN (SELECT id FROM users WHERE client_id=${clientId} AND role <> 'SUPER_ADMIN')`
    : table === "users"
      ? Prisma.sql`r.client_id=${clientId} AND r.role <> 'SUPER_ADMIN'`
      : Prisma.sql`r.client_id=${clientId}`;
}

export async function exportTenant(clientId: number, actorId: number): Promise<TenantSnapshot> {
  return prisma.$transaction(
    async (tx) => {
      const client = await tx.client.findUniqueOrThrow({ where: { id: clientId } });
      const tables: Record<string, Record<string, unknown>[]> = {};
      let size = 0;
      for (const table of TENANT_BACKUP_TABLES) {
        const money = MONEY_COLUMNS[table] ?? [];
        const json = money.length
          ? Prisma.sql`to_jsonb(r) || jsonb_build_object(${Prisma.join(money.flatMap((column) => [Prisma.sql`${column}::text`, Prisma.sql`${Prisma.raw(`r."${column}"`)}::text`]))})`
          : Prisma.sql`to_jsonb(r)`;
        tables[table] = [];
        let lastId = 0;
        for (;;) {
          const rows = await tx.$queryRaw<Array<{ data: Record<string, unknown> }>>(
            Prisma.sql`SELECT ${json} AS data FROM ${Prisma.raw(`"${table}"`)} r WHERE ${scope(table, clientId)} AND r.id > ${lastId} ORDER BY r.id LIMIT 1000`,
          );
          if (!rows.length) break;
          size += Buffer.byteLength(JSON.stringify(rows));
          if (size > MAX_BACKUP_BYTES) throw new BackupError("Backup exceeds 100 MiB; nothing was exported", 413);
          tables[table].push(...rows.map((r) => r.data));
          lastId = Number(rows[rows.length - 1].data.id);
        }
      }
      const receipts: TenantSnapshot["receipts"] = [];
      for (const payment of tables.company_payments) {
        if (!payment.receipt_path) continue;
        let bytes: Buffer;
        try {
          const absolute = getCompanyReceiptAbsolutePath(String(payment.receipt_path));
          const info = await stat(absolute);
          if (!info.isFile() || info.size > 2 * 1024 * 1024) throw new Error("Invalid receipt file");
          bytes = await readFile(absolute);
        } catch {
          throw new BackupError(`Receipt file missing for payment ${payment.id}; refusing incomplete backup`, 409);
        }
        size += Math.ceil((bytes.length * 4) / 3);
        if (size > MAX_BACKUP_BYTES) throw new BackupError("Backup with receipts exceeds 100 MiB", 413);
        receipts.push({
          paymentId: Number(payment.id),
          sha256: createHash("sha256").update(bytes).digest("hex"),
          data: bytes.toString("base64"),
        });
      }
      const snapshot = snapshotSchema.parse({
        version: 1,
        id: randomUUID(),
        exportedAt: new Date().toISOString(),
        client: JSON.parse(JSON.stringify(client)),
        tables,
        receipts,
      });
      await tx.auditLog.create({
        data: {
          client_id: clientId,
          user_id: actorId,
          action: "EXPORT",
          entity_type: "TENANT_BACKUP",
          description: `Encrypted full tenant backup ${snapshot.id}`,
        },
      });
      return snapshot;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 120000 },
  );
}

export function validateSnapshot(input: unknown, clientId: number): TenantSnapshot {
  const snapshot = snapshotSchema.parse(input);
  // Version 1 snapshots predating the outbox have no queued deliveries.
  if (!("push_deliveries" in snapshot.tables)) snapshot.tables.push_deliveries = [];
  if (snapshot.client.id !== clientId) throw new BackupError("Backup belongs to another shop", 403);
  if (Object.keys(snapshot.tables).sort().join() !== [...TENANT_BACKUP_TABLES].sort().join())
    throw new BackupError("Incomplete or unsupported table inventory");
  const userIds = new Set(snapshot.tables.users.map((row) => row.id));
  for (const table of TENANT_BACKUP_TABLES) {
    const ids = new Set();
    for (const row of snapshot.tables[table]) {
      if (!Number.isSafeInteger(row.id) || Number(row.id) <= 0 || ids.has(row.id))
        throw new BackupError("Invalid or duplicate row ID");
      ids.add(row.id);
      if (USER_SCOPED.has(table) ? !userIds.has(row.user_id) : row.client_id !== clientId)
        throw new BackupError("Foreign tenant row in backup", 403);
      if (table === "users" && !["ADMIN", "USER"].includes(String(row.role)))
        throw new BackupError("Platform accounts cannot be restored from tenant backups", 403);
    }
  }
  for (const [children, parentKey, parents] of [
    ["debts", "debtor_id", "debtors"],
    ["payments", "debtor_id", "debtors"],
    ["payment_reminders", "debtor_id", "debtors"],
    ["company_debts", "company_id", "companies"],
    ["company_payments", "company_id", "companies"],
    ["push_deliveries", "notification_id", "notifications"],
    ["push_deliveries", "subscription_id", "push_subscriptions"],
  ]) {
    const ids = new Set(snapshot.tables[parents].map((row) => row.id));
    if (snapshot.tables[children].some((row) => !ids.has(row[parentKey])))
      throw new BackupError("Missing parent record in backup");
  }
  for (const delivery of snapshot.tables.push_deliveries) {
    const notification = snapshot.tables.notifications.find((row) => row.id === delivery.notification_id);
    const subscription = snapshot.tables.push_subscriptions.find((row) => row.id === delivery.subscription_id);
    if (notification?.user_id !== subscription?.user_id) throw new BackupError("Push delivery recipient mismatch", 403);
  }
  const payments = new Map(
    snapshot.tables.company_payments.filter((row) => row.receipt_path).map((row) => [row.id, row]),
  );
  if (
    payments.size !== snapshot.receipts.length ||
    new Set(snapshot.receipts.map((r) => r.paymentId)).size !== snapshot.receipts.length
  )
    throw new BackupError("Receipt inventory mismatch");
  for (const file of snapshot.receipts) {
    const payment = payments.get(file.paymentId);
    const bytes = Buffer.from(file.data, "base64");
    if (
      !payment ||
      createHash("sha256").update(bytes).digest("hex") !== file.sha256 ||
      bytes.length !== payment.receipt_size
    )
      throw new BackupError("Receipt integrity check failed");
  }
  return snapshot;
}

async function preflight(tx: Prisma.TransactionClient, snapshot: TenantSnapshot) {
  const clientId = snapshot.client.id;
  const client = await tx.client.findUniqueOrThrow({ where: { id: clientId } });
  if (client.slug !== snapshot.client.slug) throw new BackupError("Shop identity mismatch", 409);
  for (const table of TENANT_BACKUP_TABLES) {
    const rows = snapshot.tables[table];
    if (!rows.length) continue;
    const columns = await tx.$queryRaw<
      Array<{ column_name: string }>
    >`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=${table}`;
    const keys = columns
      .map((c) => c.column_name)
      .sort()
      .join();
    if (rows.some((row) => Object.keys(row).sort().join() !== keys))
      throw new BackupError(`Schema changed for ${table}; migrate the backup before restoring`, 409);
    const collisions = await tx.$queryRaw<Array<{ id: number }>>(
      Prisma.sql`SELECT r.id FROM ${Prisma.raw(`"${table}"`)} r WHERE r.id IN (${Prisma.join(rows.map((row) => Number(row.id)))}) AND NOT (${scope(table, clientId)})`,
    );
    if (collisions.length) throw new BackupError("Backup IDs collide with another shop or platform account", 409);
  }
}

export async function previewTenant(snapshot: TenantSnapshot) {
  await prisma.$transaction((tx) => preflight(tx, snapshot));
  return {
    backupId: snapshot.id,
    clientId: snapshot.client.id,
    name: snapshot.client.name,
    exportedAt: snapshot.exportedAt,
    counts: Object.fromEntries(TENANT_BACKUP_TABLES.map((table) => [table, snapshot.tables[table].length])),
    receipts: snapshot.receipts.length,
  };
}

/** Same-tenant replacement or additive JSON merge. Audit/import history is append-only.
 * Platform admins and their device preferences remain outside tenant ownership.
 */
export async function restoreTenant(snapshot: TenantSnapshot, actorId: number, mode: "replace" | "merge" = "replace") {
  snapshot = structuredClone(snapshot);
  const createdFiles: string[] = [];
  try {
    return await prisma.$transaction(
      async (tx) => {
        const insertedCounts = Object.fromEntries(TENANT_BACKUP_TABLES.map((table) => [table, 0])) as Record<
          BackupTable,
          number
        >;
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(20260919, ${snapshot.client.id})`;
        await preflight(tx, snapshot);
        // Lock all affected tables so writes cannot slip between inventory and restore.
        await tx.$executeRawUnsafe(
          `LOCK TABLE ${TENANT_BACKUP_TABLES.map((t) => `"${t}"`).join(",")} IN SHARE ROW EXCLUSIVE MODE`,
        );
        // New file names avoid overwriting any live receipt; rollback removes only these new files.
        const existingReceiptPayments =
          mode === "merge"
            ? new Set(
                (
                  await tx.$queryRaw<Array<{ id: number }>>(
                    Prisma.sql`SELECT id FROM company_payments WHERE client_id=${snapshot.client.id}`,
                  )
                ).map((row) => row.id),
              )
            : new Set<number>();
        for (const file of snapshot.receipts) {
          if (existingReceiptPayments.has(file.paymentId)) continue;
          const relative = path.join("uploads", "company-receipts", `restore-${randomUUID()}.bin`);
          const absolute = getCompanyReceiptAbsolutePath(relative);
          await mkdir(path.dirname(absolute), { recursive: true });
          await writeFile(absolute, Buffer.from(file.data, "base64"), { flag: "wx" });
          createdFiles.push(absolute);
          snapshot.tables.company_payments.find((row) => row.id === file.paymentId)!.receipt_path = relative;
        }

        for (const table of [...TENANT_BACKUP_TABLES].reverse()) {
          if (mode === "merge" || APPEND_ONLY.has(table)) continue;
          await tx.$executeRaw(
            Prisma.sql`DELETE FROM ${Prisma.raw(`"${table}"`)} r WHERE ${scope(table, snapshot.client.id)}`,
          );
        }
        for (const table of TENANT_BACKUP_TABLES) {
          const rows = snapshot.tables[table];
          if (!rows.length) continue;
          if (table === "push_deliveries")
            for (const row of rows) {
              row.lease_token = null;
              row.locked_until = null;
              if (row.status === "PENDING") {
                row.status = "CANCELLED";
                row.last_error = "Restored backup: historical pushes are not replayed";
              }
            }
          if (table === "users") for (const row of rows) row.updated_at = new Date().toISOString(); // revoke old sessions
          insertedCounts[table] = await tx.$executeRaw(
            Prisma.sql`INSERT INTO ${Prisma.raw(`"${table}"`)} SELECT * FROM jsonb_populate_recordset(NULL::${Prisma.raw(`"${table}"`)}, ${JSON.stringify(rows)}::jsonb) ${mode === "merge" || APPEND_ONLY.has(table) ? Prisma.sql`ON CONFLICT (id) DO NOTHING` : Prisma.empty}`,
          );
          // Sequences are nontransactional: only advance, never rewind across tenants.
          await tx.$executeRawUnsafe(
            `SELECT setval(pg_get_serial_sequence('"${table}"','id'), GREATEST((SELECT COALESCE(MAX(id),1) FROM "${table}"), (SELECT last_value FROM "${table}_id_seq")), true)`,
          );
        }
        if (mode === "replace") {
          await tx.client.update({ where: { id: snapshot.client.id }, data: { name: snapshot.client.name } });
        } else {
          // Existing rows win. Recalculate balances from the combined ledger, never stale exported totals.
          for (const [parent, debts, payments, key] of [
            ["debtors", "debts", "payments", "debtor_id"],
            ["companies", "company_debts", "company_payments", "company_id"],
          ]) {
            await tx.$executeRaw(Prisma.sql`UPDATE ${Prisma.raw(parent)} p SET total_debt =
              COALESCE((SELECT SUM(amount) FROM ${Prisma.raw(debts)} d WHERE ${Prisma.raw("d." + key)}=p.id AND d.client_id=p.client_id),0)
              - COALESCE((SELECT SUM(amount) FROM ${Prisma.raw(payments)} m WHERE ${Prisma.raw("m." + key)}=p.id AND m.client_id=p.client_id),0)
              WHERE p.client_id=${snapshot.client.id}`);
          }
        }
        await tx.auditLog.create({
          data: {
            client_id: snapshot.client.id,
            user_id: actorId,
            action: "RESTORE",
            entity_type: "TENANT_BACKUP",
            description: `${mode === "merge" ? "Merged" : "Restored"} snapshot ${snapshot.id}; previous audit/import history retained`,
            new_value: { snapshot_id: snapshot.id, inserted_counts: insertedCounts },
          },
        });
        return { counts: insertedCounts };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 120000, maxWait: 10000 },
    );
  } catch (error) {
    await Promise.allSettled(createdFiles.map((file) => unlink(file)));
    throw error;
  }
}
