import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import {
  companySnapshotSeriesSql,
  rebuildCompanySnapshotHistorySql,
} from "../../src/lib/services/company-snapshot-history";

const db = new PGlite();
const rebuild = () => db.query(rebuildCompanySnapshotHistorySql, [1, "2026-01-01", "2026-01-05"]);
const rows = async () =>
  (
    await db.query<{ day: string; balance: string; debts: string; payments: string }>(`
  SELECT date::text AS day, total_outstanding_debt::text AS balance,
         debts_sum::text AS debts, payments_sum::text AS payments
  FROM company_daily_snapshots WHERE client_id = 1 ORDER BY date
`)
  ).rows;

async function main() {
  await db.exec(`
    CREATE TABLE company_debts (id int PRIMARY KEY, client_id int, amount numeric(10,2), created_at timestamp(3));
    CREATE TABLE company_payments (LIKE company_debts INCLUDING ALL);
    CREATE TABLE company_daily_snapshots (
      client_id int, date date, total_outstanding_debt numeric(12,2),
      debts_sum numeric(12,2), payments_sum numeric(12,2), debts_count int, payments_count int,
      created_at timestamp(3), updated_at timestamp(3), UNIQUE(client_id,date)
    );
    INSERT INTO company_debts VALUES
      (1,1,100.10,'2026-01-01 18:59:59.999'), (2,1,20.20,'2026-01-01 19:00:00'),
      (3,2,777,'2026-01-01 10:00:00');
    INSERT INTO company_payments VALUES
      (1,1,10.01,'2026-01-02 18:59:59.999'), (2,1,5.05,'2026-01-02 19:00:00'),
      (3,1,1,'2026-01-05 19:00:00');
    INSERT INTO company_daily_snapshots VALUES
      (1,'2026-01-04',999,0,0,0,0,NOW(),NOW()),
      (2,'2026-01-04',777,0,0,0,0,NOW(),NOW());
  `);
  // A chart must ignore stale saved totals even before the cache has been rebuilt.
  const series = await db.query<{ total_outstanding_debt: string }>(companySnapshotSeriesSql, [
    1,
    "2026-01-01",
    "2026-01-05",
  ]);
  assert.deepEqual(
    series.rows.map((row) => Number(row.total_outstanding_debt)),
    [100.1, 110.29, 105.24, 105.24, 105.24],
  );
  const empty = await db.query<{ total_outstanding_debt: string }>(companySnapshotSeriesSql, [
    3,
    "2026-01-01",
    "2026-01-05",
  ]);
  assert.deepEqual(
    empty.rows.map((row) => Number(row.total_outstanding_debt)),
    [0, 0],
  );
  await rebuild();
  const initial = await rows();
  assert.deepEqual(
    initial.map((row) => row.balance),
    ["100.10", "110.29", "105.24", "105.24", "105.24", "104.24"],
  );
  assert.equal(initial[0].debts, "100.10");
  assert.equal(initial[1].debts, "20.20");
  assert.equal(initial[1].payments, "10.01");

  // PostgreSQL session timezone must not change how UTC Prisma timestamps are grouped.
  await db.exec("SET TIME ZONE 'America/New_York'");
  await rebuild();
  assert.deepEqual(await rows(), initial);

  await db.transaction(async (tx) => {
    await tx.exec("UPDATE company_debts SET amount = 200.10 WHERE id = 1");
    await tx.query(rebuildCompanySnapshotHistorySql, [1, "2026-01-01", "2026-01-05"]);
  });
  assert.deepEqual(
    (await rows()).map((row) => row.balance),
    ["200.10", "210.29", "205.24", "205.24", "205.24", "204.24"],
  );

  await db.transaction(async (tx) => {
    await tx.exec("DELETE FROM company_payments WHERE id = 1");
    await tx.query(rebuildCompanySnapshotHistorySql, [1, "2026-01-02", "2026-01-05"]);
  });
  const afterDelete = await rows();
  assert.equal(afterDelete[0].balance, "200.10");
  assert.equal(afterDelete[1].balance, "220.30");
  assert.equal(afterDelete[1].payments, "0.00");
  assert.equal(afterDelete[3].balance, "215.25");

  await assert.rejects(
    db.transaction(async (tx) => {
      await tx.exec("DELETE FROM company_debts WHERE id = 1");
      await tx.query(rebuildCompanySnapshotHistorySql, [1, "2026-01-01", "2026-01-05"]);
      throw new Error("force rollback");
    }),
    /force rollback/,
  );
  assert.deepEqual(await rows(), afterDelete);
  await db.exec("INSERT INTO company_payments VALUES (9,4,12.34,'2026-01-01 10:00:00')");
  const advance = await db.query<{ total_outstanding_debt: string }>(companySnapshotSeriesSql, [
    4,
    "2026-01-01",
    "2026-01-01",
  ]);
  assert.equal(Number(advance.rows[0].total_outstanding_debt), -12.34);
  assert.equal(
    (
      await db.query<{ balance: string }>(
        "SELECT total_outstanding_debt::text AS balance FROM company_daily_snapshots WHERE client_id = 2",
      )
    ).rows[0].balance,
    "777.00",
  );
  console.log(
    "PASS: timezone boundary, historical edit/delete, empty days, future entries, rollback and tenant isolation",
  );
}

main()
  .finally(() => db.close())
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
