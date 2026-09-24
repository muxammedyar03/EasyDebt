import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { Prisma } from "@prisma/client";
import { listPredicate, listOrder, countQuery, idsQuery } from "../../src/entities/debtor/api/debtor-list-query";
async function main() {
  const db = new PGlite();
  const run = async <T>(query: Prisma.Sql) => (await db.query<T>(query.text, query.values)).rows;
  try {
    await db.exec(`CREATE TABLE debtors (id int PRIMARY KEY, client_id int, first_name text, last_name text, address text, phone_number text, total_debt numeric(10,2), created_by int, created_at timestamp, updated_at timestamp);
      INSERT INTO debtors SELECT n,7,'Ali','Valiyev','Nukus','+998 (90) 123-45-67',CASE WHEN n <= 270 THEN 0 ELSE 100 END,70,'2026-01-01','2026-01-01' FROM generate_series(1,300) n;
      INSERT INTO debtors VALUES (301,8,'Ali','Valiyev','Nukus','+998 (90) 123-45-67',0,80,'2026-01-01','2026-01-01'),
      (302,7,'100%_real','Name',NULL,NULL,0,71,'2026-01-01','2026-01-01'),
      (303,7,'100xxreal','Name',NULL,NULL,0,71,'2026-01-01','2026-01-01');`);
    const where = listPredicate(7, { search: "ali VALI", status: "paid_off", createdBy: 70 });
    assert.equal((await run<{ total: number }>(countQuery(where)))[0].total, 270);
    const order = listOrder("name", "asc");
    assert.deepEqual(
      (await run<{ id: number }>(idsQuery(where, order, 10, 10))).map((r) => r.id),
      Array.from({ length: 10 }, (_, i) => i + 11),
    );
    assert.deepEqual(
      (await run<{ id: number }>(idsQuery(where, order, 260, 10))).map((r) => r.id),
      Array.from({ length: 10 }, (_, i) => i + 261),
    );
    assert.equal(
      (await run<{ total: number }>(countQuery(listPredicate(7, { search: "9012345", minDebt: 50, maxDebt: 150 }))))[0]
        .total,
      30,
    );
    assert.equal(
      (await run<{ total: number }>(countQuery(listPredicate(7, { search: "+998 90 123-45", maxDebt: 0 }))))[0].total,
      270,
    );
    assert.deepEqual(
      (await run<{ id: number }>(idsQuery(listPredicate(7, { search: "100%_real" }), order, 0, 10))).map((r) => r.id),
      [302],
    );
    assert.equal((await run<{ total: number }>(countQuery(listPredicate(7, { search: "' OR 1=1 --" }))))[0].total, 0);
    assert.deepEqual(
      (await run<{ id: number }>(idsQuery(where, listOrder("id; DROP TABLE debtors", "asc"), 0, 2))).map((r) => r.id),
      [1, 2],
    );
    assert.equal((await run<{ total: number }>(countQuery(listPredicate(8, { search: "Ali" }))))[0].total, 1);
    assert.throws(() => listPredicate(0), /Client context/);
    console.log(
      "PASS: 270 matching rows, search/status/page 2, stable sorting, phone normalization, other tenant and escaping",
    );
  } finally {
    await db.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
