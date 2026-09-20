import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";

/** Shared PostgreSQL fixed window, atomic across application instances. */
export async function takeSensitiveAttempt(userId: number, scope: "pin" | "backup"): Promise<boolean> {
  const key = createHash("sha256").update(`${scope}:${userId}`).digest("hex");
  const rows = await prisma.$queryRaw<Array<{ attempts: number }>>`
    INSERT INTO security_rate_limits (key, window_start, attempts)
    VALUES (${key}, date_trunc('hour', now()) + floor(extract(minute from now()) / 15) * interval '15 minutes', 1)
    ON CONFLICT (key) DO UPDATE SET
      attempts = CASE WHEN security_rate_limits.window_start = EXCLUDED.window_start THEN security_rate_limits.attempts + 1 ELSE 1 END,
      window_start = EXCLUDED.window_start
    RETURNING attempts`;
  return rows[0].attempts <= 5;
}

export const takePinAttempt = (userId: number) => takeSensitiveAttempt(userId, "pin");
