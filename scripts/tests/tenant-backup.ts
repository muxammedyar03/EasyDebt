import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { Prisma } from "@prisma/client";
import { prisma } from "../../src/lib/prisma";
import { exportTenant, previewTenant, restoreTenant, validateSnapshot } from "../../src/lib/tenant-backup/service";
import { sealBackup, openBackup } from "../../src/lib/tenant-backup/archive";
import { TENANT_BACKUP_TABLES } from "../../src/lib/tenant-backup/tables";

function sql(args: unknown[]) {
  const first = args[0] as Prisma.Sql | TemplateStringsArray;
  if ("text" in first) return { text: first.text, values: first.values };
  return {
    text: Array.from(first)
      .map((s, i) => s + (i < first.length - 1 ? `$${i + 1}` : ""))
      .join(""),
    values: args.slice(1),
  };
}
async function main() {
  process.env.TENANT_BACKUP_SECRET = "test-backup-only-01234567890123456789012345";
  const schema = execFileSync(
    process.execPath,
    [
      "node_modules/prisma/build/index.js",
      "migrate",
      "diff",
      "--from-empty",
      "--to-schema-datamodel",
      "prisma/schema.prisma",
      "--script",
    ],
    { encoding: "utf8" },
  );
  const db = new PGlite();
  const files: string[] = [];
  const receiptPath = `uploads/company-receipts/backup-test-${Date.now()}.png`;
  const receipt = Buffer.from("89504e470d0a1a0a", "hex");
  await mkdir(path.dirname(receiptPath), { recursive: true });
  await writeFile(receiptPath, receipt);
  files.push(receiptPath);
  const adapter = (tx: { query: PGlite["query"]; exec: PGlite["exec"] }) => ({
    $queryRaw: async (...args: unknown[]) => {
      const q = sql(args);
      return (await tx.query(q.text, q.values)).rows;
    },
    $executeRaw: async (...args: unknown[]) => {
      const q = sql(args);
      return (await tx.query(q.text, q.values)).affectedRows;
    },
    $executeRawUnsafe: async (text: string) => {
      await tx.exec(text);
      return 0;
    },
    client: {
      findUniqueOrThrow: async ({ where }: { where: { id: number } }) => {
        const rows = (await tx.query("SELECT * FROM clients WHERE id=$1", [where.id])).rows;
        if (!rows[0]) throw new Error("Client missing");
        return rows[0];
      },
      update: async ({ where, data }: { where: { id: number }; data: { name: string } }) =>
        tx.query("UPDATE clients SET name=$1 WHERE id=$2", [data.name, where.id]),
    },
    auditLog: {
      create: async ({ data }: { data: Record<string, unknown> }) =>
        tx.query("INSERT INTO audit_logs (client_id,user_id,action,entity_type,description) VALUES ($1,$2,$3,$4,$5)", [
          data.client_id,
          data.user_id,
          data.action,
          data.entity_type,
          data.description,
        ]),
    },
  });
  prisma.$transaction = ((fn: (tx: unknown) => Promise<unknown>) =>
    db.transaction((tx) => fn(adapter(tx)))) as typeof prisma.$transaction;
  try {
    await db.exec(schema);
    await db.exec("DROP TABLE import_history");
    const repairImportHistory = await readFile(
      "prisma/migrations/20260929135500_repair_import_history/migration.sql",
      "utf8",
    );
    await db.exec(repairImportHistory);
    for (const id of [1, 2]) {
      const n = id * 10;
      await db.exec(`INSERT INTO clients (id,name,slug,updated_at) VALUES (${id},'Shop ${id}','shop-${id}',now());
        INSERT INTO users (id,username,password,role,client_id,updated_at) VALUES (${n},'user-${id}','hash-${id}','ADMIN',${id},now());
        INSERT INTO settings (id,key,value,client_id,updated_at) VALUES (${n},'overdue_days','45',${id},now());
        INSERT INTO debtors (id,external_id,first_name,last_name,total_debt,created_by,client_id,updated_at) VALUES (${n},'debtor-${id}','First','Last',90,${n},${id},now());
        INSERT INTO companies (id,external_id,name,total_debt,created_by,client_id,updated_at) VALUES (${n},'company-${id}','Supplier',90,${n},${id},now());
        INSERT INTO debts (id,external_id,debtor_id,amount,created_by,client_id) VALUES (${n},'debt-${id}',${n},100,${n},${id});
        INSERT INTO payments (id,external_id,debtor_id,amount,created_by,client_id,resets_rating) VALUES (${n},'payment-${id}',${n},10,${n},${id},true);
        INSERT INTO payment_reminders (id,debtor_id,created_by,reminder_at,client_id,updated_at) VALUES (${n},${n},${n},now(),${id},now());
        INSERT INTO company_debts (id,external_id,company_id,amount,created_by,client_id) VALUES (${n},'cd-${id}',${n},100,${n},${id});
        INSERT INTO company_payments (id,external_id,company_id,amount,created_by,client_id) VALUES (${n},'cp-${id}',${n},10,${n},${id});
        INSERT INTO company_daily_snapshots (id,date,total_outstanding_debt,client_id,updated_at) VALUES (${n},current_date,90,${id},now());
        INSERT INTO notifications (id,user_id,debtor_id,type,title,message,client_id) VALUES (${n},${n},${n},'PAYMENT_RECEIVED','Received','Paid',${id});
        INSERT INTO audit_logs (id,user_id,action,entity_type,client_id) VALUES (${n},${n},'CREATE','PAYMENT',${id});
        INSERT INTO import_history (id,user_id,file_hash,debtors_count,debts_count,payments_count,client_id) VALUES (${n},${n},'hash-${id}',1,1,1,${id});
        INSERT INTO push_subscriptions (id,user_id,endpoint,p256dh,auth,updated_at) VALUES (${n},${n},'https://push.invalid/${id}','key','auth',now());
        INSERT INTO push_deliveries (id,client_id,notification_id,subscription_id) VALUES (${n},${id},${n},${n});
        INSERT INTO user_push_preferences (id,user_id,enabled,updated_at) VALUES (${n},${n},true,now());`);
    }
    await db.exec(repairImportHistory);
    assert.equal((await db.query("SELECT id FROM import_history")).rows.length, 2, "repair preserves existing history");
    await db.exec(
      "INSERT INTO users (id,username,password,role,client_id,updated_at) VALUES (99,'platform','platform-hash','SUPER_ADMIN',1,now()); SELECT setval('audit_logs_id_seq',100,true)",
    );
    await db.query(
      "UPDATE company_payments SET receipt_path=$1,receipt_name=$2,receipt_mime=$3,receipt_size=$4 WHERE id=10",
      [receiptPath, "chek.png", "image/png", receipt.length],
    );
    const untouched: Record<string, unknown[]> = {};
    for (const table of TENANT_BACKUP_TABLES)
      untouched[table] = (await db.query(`SELECT to_jsonb(r) AS data FROM "${table}" r WHERE id=20`)).rows;
    const snapshot = await exportTenant(1, 99);
    assert.equal(snapshot.tables.users.length, 1, "platform accounts must not be exported as tenant credentials");
    for (const table of TENANT_BACKUP_TABLES) assert.equal(snapshot.tables[table].length, 1, `coverage ${table}`);
    const decoded = validateSnapshot(openBackup(sealBackup(snapshot)), 1);
    const legacy = structuredClone(snapshot);
    delete legacy.tables.push_deliveries;
    assert.deepEqual(validateSnapshot(legacy, 1).tables.push_deliveries, [], "older backups remain restorable");
    await previewTenant(decoded);
    assert.throws(() => validateSnapshot(decoded, 2), /another shop/);
    await db.exec("UPDATE debtors SET first_name='changed' WHERE id=10; UPDATE settings SET value='99' WHERE id=10;");
    await restoreTenant(decoded, 99);
    assert.equal(
      (await db.query<{ first_name: string }>("SELECT first_name FROM debtors WHERE id=10")).rows[0].first_name,
      "First",
    );
    assert.equal((await db.query<{ value: string }>("SELECT value FROM settings WHERE id=10")).rows[0].value, "45");
    for (const table of TENANT_BACKUP_TABLES) {
      assert.deepEqual(
        (await db.query(`SELECT to_jsonb(r) AS data FROM "${table}" r WHERE id=20`)).rows,
        untouched[table],
        `tenant B changed: ${table}`,
      );
      const row = (
        await db.query<{ data: Record<string, unknown> }>(`SELECT to_jsonb(r) AS data FROM "${table}" r WHERE id=10`)
      ).rows[0].data;
      const expected = { ...snapshot.tables[table][0] };
      for (const key of Object.keys(expected)) {
        if (table === "users" && key === "updated_at") continue;
        if (table === "company_payments" && key === "receipt_path") continue;
        if (table === "push_deliveries" && key === "status") {
          assert.equal(row.status, "CANCELLED", "restored pushes must not replay");
          continue;
        }
        if (table === "push_deliveries" && key === "last_error") continue;
        // PostgreSQL numeric JSON values are deliberately serialized as strings by export.
        if (typeof expected[key] === "string" && typeof row[key] === "number")
          assert.equal(new Prisma.Decimal(String(row[key])).equals(String(expected[key])), true);
        else assert.deepEqual(row[key], expected[key], `${table}.${key}`);
      }
    }
    const restoredPath = (
      await db.query<{ receipt_path: string }>("SELECT receipt_path FROM company_payments WHERE id=10")
    ).rows[0].receipt_path;
    files.push(restoredPath);
    assert.deepEqual(await readFile(restoredPath), receipt);
    // JSON merge retains newer rows and current edits; importing twice does not duplicate ledger entries.
    await db.exec(
      "UPDATE debtors SET first_name='Keep current' WHERE id=10; DELETE FROM notifications WHERE id=10; INSERT INTO debts (id,external_id,debtor_id,amount,created_by,client_id) VALUES (500,'new-after-export',10,7,10,1)",
    );
    for (let i = 0; i < 2; i++) {
      await restoreTenant(structuredClone(snapshot), 99, "merge");
      assert.equal(
        (await db.query<{ first_name: string }>("SELECT first_name FROM debtors WHERE id=10")).rows[0].first_name,
        "Keep current",
      );
      assert.equal(
        Number(
          (await db.query<{ total_debt: string }>("SELECT total_debt FROM debtors WHERE id=10")).rows[0].total_debt,
        ),
        97,
      );
      assert.equal((await db.query("SELECT id FROM debts WHERE client_id=1")).rows.length, 2);
      assert.equal((await db.query("SELECT id FROM notifications WHERE id=10")).rows.length, 1);
      for (const table of TENANT_BACKUP_TABLES)
        assert.deepEqual(
          (await db.query(`SELECT to_jsonb(r) AS data FROM "${table}" r WHERE id=20`)).rows,
          untouched[table],
        );
    }
    const beforeFailed = (await db.query("SELECT * FROM debtors ORDER BY id")).rows;
    const broken = structuredClone(snapshot);
    broken.tables.users[0].username = "user-2"; // global unique collision
    await assert.rejects(restoreTenant(broken, 99));
    assert.deepEqual(
      (await db.query("SELECT * FROM debtors ORDER BY id")).rows,
      beforeFailed,
      "restore failure did not roll back",
    );
    console.log(
      "PASS: encrypted full tenant backup including push deliveries, cross-tenant isolation, legacy import, receipt round trip and rollback",
    );
  } finally {
    await db.close();
    await prisma.$disconnect();
    await Promise.allSettled(files.map((file) => rm(file, { force: true })));
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
