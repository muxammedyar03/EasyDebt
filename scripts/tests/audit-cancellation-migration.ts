import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

async function main() {
  const db = new PGlite();
  try {
    await db.exec(`CREATE TABLE debts (id integer PRIMARY KEY, client_id integer NOT NULL, amount numeric(10,2) NOT NULL);
      CREATE TABLE payments (id integer PRIMARY KEY, client_id integer NOT NULL, amount numeric(10,2) NOT NULL);
      INSERT INTO debts VALUES (1,1,100), (2,2,100);
      INSERT INTO payments VALUES (3,1,100), (4,2,100);`);
    const migration = await readFile("prisma/migrations/20260930113000_audit_financial_cancellation/migration.sql", "utf8");
    await db.exec(migration);
    await db.exec(`INSERT INTO debts (id,client_id,amount,reverses_debt_id) VALUES (5,1,-100,1);
      INSERT INTO payments (id,client_id,amount,reverses_payment_id) VALUES (6,1,-100,3);`);
    await assert.rejects(db.exec("INSERT INTO debts (id,client_id,amount,reverses_debt_id) VALUES (7,1,-100,1)"), { code: "23505" });
    await assert.rejects(db.exec("INSERT INTO payments (id,client_id,amount,reverses_payment_id) VALUES (8,1,-100,3)"), { code: "23505" });
    await assert.rejects(db.exec("INSERT INTO debts (id,client_id,amount,reverses_debt_id) VALUES (9,1,100,2)"), { code: "23514" });
    await assert.rejects(db.exec("INSERT INTO debts (id,client_id,amount,reverses_debt_id) VALUES (10,1,-100,2)"), { code: "23503" });
    await assert.rejects(db.exec("INSERT INTO payments (id,client_id,amount,reverses_payment_id) VALUES (11,1,-100,4)"), { code: "23503" });
    const result = await db.query<{ tenant: number; debt: string }>(
      "SELECT client_id AS tenant, SUM(amount)::text AS debt FROM debts GROUP BY client_id ORDER BY client_id",
    );
    assert.deepEqual(result.rows, [{ tenant: 1, debt: "0.00" }, { tenant: 2, debt: "100.00" }]);
    console.log("PASS: unique reversal, negative adjustment, and tenant balances");
  } finally {
    await db.close();
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
