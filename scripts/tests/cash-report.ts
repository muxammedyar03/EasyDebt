import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { reportTotalsSql, reportPageSql, reportExportSql } from "../../src/lib/repositories/cash-report.sql";

async function main() {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE TABLE debtors (id int, client_id int, external_id text, first_name text, last_name text, total_debt numeric(10,2), is_overdue boolean);
      CREATE TABLE payments (id int, debtor_id int, client_id int, amount numeric(10,2), payment_type text, note text, created_at timestamp);
      CREATE TABLE debts (id int, debtor_id int, client_id int, amount numeric(10,2), description text, created_at timestamp);
      INSERT INTO debtors VALUES (1,7,'shop-7','First','Shop',50,false), (2,8,'shop-8','Other','Shop',900,true);
      INSERT INTO payments SELECT n,1,7,0.10,CASE WHEN n % 2 = 0 THEN 'CARD' ELSE 'CASH' END,NULL,'2026-01-09 19:00:00' FROM generate_series(1,2501) n;
      INSERT INTO debts SELECT n,1,7,0.20,NULL,'2026-01-10 18:59:59.999' FROM generate_series(1,101) n;
      INSERT INTO payments VALUES (3000,2,8,900,'CASH',NULL,'2026-01-10 00:00:00'),
        (3001,1,7,700,'CASH',NULL,'2026-01-09 18:59:59.999'),
        (3002,1,7,800,'CASH',NULL,'2026-01-10 19:00:00'),
        (3003,2,7,999,'CASH',NULL,'2026-01-10 00:00:00');
    `);
    const params = [7, "2026-01-09T19:00:00Z", "2026-01-10T19:00:00Z"];
    const result = await db.query<{
      payments_count: number;
      debts_count: number;
      total_payments: string;
      total_debts: string;
      cash: string;
      card: string;
    }>(reportTotalsSql, params);
    assert.equal(result.rows[0].payments_count, 2501);
    assert.equal(result.rows[0].debts_count, 101);
    assert.equal(result.rows[0].total_payments, "250.10");
    assert.equal(result.rows[0].total_debts, "20.20");
    assert.equal(result.rows[0].cash, "125.10");
    assert.equal(result.rows[0].card, "125.00");
    // Equal timestamps must have deterministic pagination, including beyond the old 2000 cap.
    const first = await db.query<{ id: number }>(reportPageSql, [...params, "payment", 50, 0]);
    const last = await db.query<{ id: number }>(reportPageSql, [...params, "payment", 50, 2500]);
    assert.equal(first.rows.length, 50);
    assert.equal(first.rows[0].id, 2501);
    assert.deepEqual(
      last.rows.map((row) => row.id),
      [1],
    );
    const rows: { kind: string; id: number; amount: string }[] = [];
    let kind = "",
      id = 0;
    for (;;) {
      const batch = await db.query<{ kind: string; id: number; amount: string }>(reportExportSql, [
        ...params,
        kind,
        id,
        500,
      ]);
      if (!batch.rows.length) break;
      rows.push(...batch.rows);
      ({ kind, id } = batch.rows[batch.rows.length - 1]);
    }
    assert.equal(rows.length, 2602);
    assert.equal(new Set(rows.map((r) => `${r.kind}:${r.id}`)).size, 2602);
    const cents = (kind: string) =>
      rows.filter((r) => r.kind === kind).reduce((sum, r) => sum + BigInt(r.amount.replace(".", "")), BigInt(0));
    assert.equal(cents("payment"), BigInt(25010));
    assert.equal(cents("debt"), BigInt(2020));
    const empty = await db.query<{ payments_count: number }>(reportTotalsSql, [99, ...params.slice(1)]);
    assert.equal(empty.rows[0].payments_count, 0);
    console.log(
      "PASS: 2501 payments, historical range, exact totals, both day boundaries, tenant isolation, stable pages and complete batched export",
    );
  } finally {
    await db.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
