import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/**
 * Settings entity – API (repository).
 * Data access for Settings; only Prisma queries, no business logic.
 */
export class SettingsRepository {
  async findByKey(key: string, shopId: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    return client.settings.findUnique({
      where: { shop_id_key: { shop_id: shopId, key } },
    });
  }

  async findMany(where?: Prisma.SettingsWhereInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    return client.settings.findMany({ where });
  }

  async upsert(
    shopId: number | null,
    key: string,
    value: string,
    tx?: Prisma.TransactionClient,
  ): Promise<{ id: number; key: string; value: string; created_at: Date; updated_at: Date }> {
    const client = tx ?? prisma;
    return client.settings.upsert({
      where: { shop_id_key: { shop_id: shopId ?? 0, key } },
      update: { value, shop_id: shopId ?? 0 },
      create: { shop_id: shopId ?? 0, key, value },
    });
  }

  /** Default 2_000_000 if not set */
  async getDebtLimit(shopId: number | null, tx?: Prisma.TransactionClient): Promise<number> {
    if (!shopId) {
      return 0;
    }
    const row = await this.findByKey("debt_limit", shopId, tx);
    return row ? parseFloat(row.value) : 2000000;
  }

  /** Default 45 if not set */
  async getOverdueDays(shopId: number, tx?: Prisma.TransactionClient): Promise<number> {
    if (!shopId) {
      return 0;
    }
    const row = await this.findByKey("overdue_days", shopId, tx);
    return row ? parseInt(row.value, 10) : 45;
  }
}

export const settingsRepository = new SettingsRepository();
