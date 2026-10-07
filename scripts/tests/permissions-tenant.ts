import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

async function main() {
  const db = new PGlite();
  try {
    await db.exec(`CREATE TABLE clients (id integer PRIMARY KEY);
      CREATE TABLE users (id integer PRIMARY KEY, client_id integer NOT NULL REFERENCES clients(id));
      INSERT INTO clients VALUES (1), (2);
      INSERT INTO users VALUES (11,1), (22,2);`);
    const migration = await readFile("prisma/migrations/20260930000000_permissions_management/migration.sql", "utf8");
    await db.exec(migration);
    await db.exec(`INSERT INTO client_permissions (client_id,key,enabled) VALUES (1,'payments.create',true);
      INSERT INTO user_permissions (client_id,user_id,key,enabled) VALUES (1,11,'payments.create',true)`);
    await assert.rejects(
      db.exec("INSERT INTO user_permissions (client_id,user_id,key,enabled) VALUES (1,22,'debtors.view',true)"),
      { code: "23503" },
    );
    await assert.rejects(db.exec("UPDATE user_permissions SET client_id=2 WHERE user_id=11"), { code: "23503" });
    await assert.rejects(
      db.exec("INSERT INTO user_permissions (client_id,user_id,key,enabled) VALUES (1,11,'payments.create',false)"),
      { code: "23505" },
    );
    await db.exec("DELETE FROM users WHERE id=11");
    await db.exec("DELETE FROM clients WHERE id=1");
    const result = await db.query<{ count: number }>("SELECT count(*)::int AS count FROM user_permissions");
    assert.equal(result.rows[0].count, 0);
    console.log("PASS: cross-shop grants rejected, duplicate grants rejected, and grants cascade with shop");
  } finally {
    await db.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
