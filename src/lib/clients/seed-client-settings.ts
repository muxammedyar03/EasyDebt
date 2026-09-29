import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

const DEFAULT_SETTINGS: Array<{ key: string; value: string }> = [
  { key: "debt_limit", value: "2000000" },
  { key: "overdue_days", value: "45" },
];

export async function seedClientSettings(clientId: number, tx: Prisma.TransactionClient = prisma) {
  for (const setting of DEFAULT_SETTINGS) {
    await tx.settings.upsert({
      where: { client_id_key: { client_id: clientId, key: setting.key } },
      update: {},
      create: {
        client_id: clientId,
        key: setting.key,
        value: setting.value,
      },
    });
  }
}

export function slugifyClientName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}
