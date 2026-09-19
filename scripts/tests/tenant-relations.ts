import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { tenantRelationStatements } from "../../src/lib/migrations/tenant-relations";

const relations = [
  ["debts", "debtor_id", "debtors"],
  ["payments", "debtor_id", "debtors"],
  ["payment_reminders", "debtor_id", "debtors"],
  ["company_debts", "company_id", "companies"],
  ["company_payments", "company_id", "companies"],
] as const;
async function fixture(db: PGlite) {
  for (const parent of ["debtors", "companies"]) {
    await db.exec(`CREATE TABLE ${parent} (id integer PRIMARY KEY, client_id integer NOT NULL);
      INSERT INTO ${parent} VALUES (10,1), (20,2);`);
  }
  for (const [table, key] of relations) {
    await db.exec(
      `CREATE TABLE ${table} (id integer PRIMARY KEY, ${key} integer NOT NULL, client_id integer NOT NULL);`,
    );
  }
}
async function migrate(db: PGlite) {
  await db.transaction(async (tx) => {
    for (const sql of tenantRelationStatements) await tx.exec(sql);
  });
}
async function main() {
  const db = new PGlite();
  try {
    await fixture(db);
    await migrate(db);
    await migrate(db); // Production runner is intentionally idempotent.
    for (const [table, key] of relations) {
      await db.exec(`INSERT INTO ${table} VALUES (1,10,1)`);
      await assert.rejects(db.exec(`INSERT INTO ${table} VALUES (2,20,1)`), { code: "23503" });
      await assert.rejects(db.exec(`UPDATE ${table} SET ${key}=20 WHERE id=1`), { code: "23503" });
      await assert.rejects(db.exec(`UPDATE ${table} SET client_id=2 WHERE id=1`), { code: "23503" });
    }
    // Moving only a parent to another tenant must not silently reassign its ledger.
    await assert.rejects(db.exec("UPDATE debtors SET client_id=2 WHERE id=10"), { code: "23001" });
    for (const parent of ["debtors", "companies"]) await db.exec(`DELETE FROM ${parent} WHERE id=10`);
    for (const [table] of relations) {
      const result = await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM ${table}`);
      assert.equal(result.rows[0].n, 0);
    }
  } finally {
    await db.close();
  }

  const inconsistent = new PGlite();
  try {
    await fixture(inconsistent);
    await inconsistent.exec("INSERT INTO payments VALUES (1,20,1)");
    await assert.rejects(migrate(inconsistent), { code: "23503" });
    const constraints = await inconsistent.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM pg_constraint WHERE contype='f' AND connamespace='public'::regnamespace",
    );
    assert.equal(constraints.rows[0].n, 0, "failed migration must rollback all constraints");
    const data = await inconsistent.query("SELECT * FROM payments");
    assert.deepEqual(data.rows, [{ id: 1, debtor_id: 20, client_id: 1 }], "must never silently repair ownership");
  } finally {
    await inconsistent.close();
  }
  console.log(
    "PASS: five tenant foreign keys, insert/update isolation, cascade delete, idempotent migration and dirty-data rollback",
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
