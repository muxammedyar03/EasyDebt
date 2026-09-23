import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { createMigrationBuilder } from "../../src/lib/migrations/builder";
import { createPrismaAdapter } from "../../src/lib/migrations/adapter";
import type { PrismaClient } from "@prisma/client";

const database = new PGlite();
function client(db: { query: PGlite["query"]; exec: PGlite["exec"] }) {
  return {
    $queryRawUnsafe: async (sql: string, ...params: unknown[]) => {
      const result = await db.query(sql, params);
      // Prisma 5 rejects PG type 2278 (void); PGlite itself accepts it.
      assert.ok(
        result.fields.every((field) => field.dataTypeID !== 2278),
        "Prisma cannot deserialize void",
      );
      return result.rows;
    },
    $executeRawUnsafe: async (sql: string) => {
      await db.exec(sql);
    },
  };
}
async function main() {
  await database.exec("CREATE TABLE _custom_migrations (name text PRIMARY KEY, created_at timestamptz)");
  const root = {
    ...client(database),
    $transaction: async (work: (tx: ReturnType<typeof client>) => Promise<unknown>) =>
      database.transaction((tx) => work(client(tx))),
  };
  const adapter = createPrismaAdapter(root as unknown as PrismaClient);
  await assert.rejects(
    createMigrationBuilder("fail", adapter)
      .run("CREATE TABLE transfer (id integer PRIMARY KEY)")
      .code(async (tx) => {
        await tx.exec("INSERT INTO transfer VALUES (1)");
        throw Error("abort");
      })
      .commit(),
    /abort/,
  );
  assert.equal(
    (await database.query<{ name: string | null }>("SELECT to_regclass('transfer') AS name")).rows[0].name,
    null,
  );
  assert.equal(
    (await database.query<{ count: number }>("SELECT COUNT(*)::int AS count FROM _custom_migrations")).rows[0].count,
    0,
  );
  await createMigrationBuilder("ok", adapter)
    .run("CREATE TABLE transfer (id integer PRIMARY KEY)")
    .code(async (tx) => {
      await tx.exec("INSERT INTO transfer VALUES (1)");
      return ["INSERT INTO transfer VALUES (2)"];
    })
    .commit();
  await createMigrationBuilder("ok", adapter).run("INSERT INTO transfer VALUES (3)").commit();
  assert.deepEqual(
    (await database.query<{ id: number }>("SELECT id FROM transfer ORDER BY id")).rows.map((r) => r.id),
    [1, 2],
  );
  assert.equal(
    (await database.query<{ count: number }>("SELECT COUNT(*)::int AS count FROM _custom_migrations")).rows[0].count,
    1,
  );
  console.log("PASS: custom migration SQL and callback rollback together; rerun stays idempotent");
}
main()
  .finally(() => database.close())
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
