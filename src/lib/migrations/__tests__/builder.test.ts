import { createMigrationBuilder } from "../builder";
import { createPrismaAdapter } from "../adapter";
import { PrismaClient } from "@prisma/client";
it("executes DDL, callback effects and tracking row on the same transaction in declaration order", async () => {
  const calls: string[] = [];
  const tx = {
    $queryRawUnsafe: jest.fn(async (sql: string) => {
      calls.push(sql);
      return [];
    }),
    $executeRawUnsafe: jest.fn(async (sql: string) => {
      calls.push(sql);
    }),
  };
  const root = {
    $transaction: jest.fn(async (fn) => fn(tx)),
    $queryRawUnsafe: jest.fn(),
    $executeRawUnsafe: jest.fn(),
  };
  await createMigrationBuilder("a'b", createPrismaAdapter(root as unknown as PrismaClient))
    .run("CREATE TABLE example (id int)")
    .code(async (adapter) => {
      await adapter.exec("INSERT INTO example VALUES (1)");
      return ["UPDATE example SET id=2"];
    })
    .commit();
  expect(calls.slice(2, 5)).toEqual([
    "CREATE TABLE example (id int)",
    "INSERT INTO example VALUES (1)",
    "UPDATE example SET id=2",
  ]);
  expect(root.$executeRawUnsafe).not.toHaveBeenCalled();
  expect(tx.$queryRawUnsafe).toHaveBeenLastCalledWith(expect.stringContaining("RETURNING name"), "a'b");
});
it("propagates callback failure to the transaction instead of recording success", async () => {
  const query = jest.fn(async () => []);
  const root = { $transaction: jest.fn(async (fn) => fn({ $queryRawUnsafe: query, $executeRawUnsafe: jest.fn() })) };
  await expect(
    createMigrationBuilder("failure", createPrismaAdapter(root as unknown as PrismaClient))
      .code(async () => {
        throw new Error("callback failed");
      })
      .commit(),
  ).rejects.toThrow("callback failed");
  expect(query.mock.calls).toHaveLength(2);
});
