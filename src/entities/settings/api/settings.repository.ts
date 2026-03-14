import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/**
 * Settings entity – API (repository).
 * Data access for Settings; only Prisma queries, no business logic.
 */
export class SettingsRepository {
  async findByKey(key: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    return client.settings.findUnique({
      where: { key },
    });
  }

  async findMany(where?: Prisma.SettingsWhereInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    return client.settings.findMany({ where });
  }

  async upsert(
    key: string,
    value: string,
    tx?: Prisma.TransactionClient,
  ): Promise<{ id: number; key: string; value: string; created_at: Date; updated_at: Date }> {
    const client = tx ?? prisma;
    return client.settings.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  /** Default 2_000_000 if not set */
  async getDebtLimit(tx?: Prisma.TransactionClient): Promise<number> {
    const row = await this.findByKey("debt_limit", tx);
    return row ? parseFloat(row.value) : 2000000;
  }

  /** Default 45 if not set */
  async getOverdueDays(tx?: Prisma.TransactionClient): Promise<number> {
    const row = await this.findByKey("overdue_days", tx);
    return row ? parseInt(row.value, 10) : 45;
  }
}

export const settingsRepository = new SettingsRepository();
