import { setTimeout } from "node:timers/promises";

const secret = process.env.CRON_SECRET;
if (!secret) throw new Error("CRON_SECRET is required for the push worker");
const url = process.env.PUSH_WORKER_URL || "http://app:3000/api/cron/push-deliveries";

for (;;) {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(50000),
    });
    if (!response.ok) console.error(`[push-worker] HTTP ${response.status}`);
    await response.arrayBuffer();
  } catch (error) {
    console.error("[push-worker] Request failed:", error.message);
  }
  await setTimeout(10000);
}
