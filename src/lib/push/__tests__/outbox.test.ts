import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { claimDeliveryQuery, retryAt } from "../outbox";

it("claims each queued device once and reclaims abandoned leases", async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE TABLE notifications (id SERIAL PRIMARY KEY, client_id INT NOT NULL);
      CREATE TABLE push_subscriptions (id SERIAL PRIMARY KEY);`);
    await db.exec(readFileSync("prisma/migrations/20260925000000_durable_push_delivery/migration.sql", "utf8"));
    await db.exec(`INSERT INTO notifications(client_id) VALUES (7);
      INSERT INTO push_subscriptions DEFAULT VALUES;
      INSERT INTO push_deliveries(client_id,notification_id,subscription_id) VALUES (7,1,1);`);
    const claim = async () => {
      const sql = claimDeliveryQuery(randomUUID());
      return (await db.query<{ id: number }>(sql.text, sql.values)).rows;
    };
    const results = await Promise.all([claim(), claim()]);
    expect(results.flatMap((rows) => rows.map((row) => row.id))).toEqual([1]);
    await db.exec(`UPDATE push_deliveries SET locked_until=NOW()-INTERVAL '1 second' WHERE id=1`);
    expect((await claim()).map((row) => row.id)).toEqual([1]);
    await db.exec(`UPDATE push_deliveries SET status='SENT', locked_until=NULL WHERE id=1`);
    expect(await claim()).toEqual([]);
  } finally {
    await db.close();
  }
});

it("delays retries with a capped backoff", () => {
  expect(retryAt(1, 0).getTime()).toBe(30_000);
  expect(retryAt(10, 0).getTime()).toBe(3_600_000);
});
