import { prisma } from "@/lib/prisma";
import type { Prisma, PrismaClient } from "@prisma/client";

type TxClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

/**
 * Settings entity – API (repository).
 * Data access for Settings; only Prisma queries, no business logic.
 * Unique key is [client_id, key].
 */
export class SettingsRepository {
  async findByKey(clientId: number, key: string, tx?: TxClient) {
    const client = tx ?? prisma;
    return client.settings.findUnique({
      where: { client_id_key: { client_id: clientId, key } },
    });
  }

  async findMany(clientId: number, where?: Omit<Prisma.SettingsWhereInput, "client_id">, tx?: TxClient) {
    const client = tx ?? prisma;
    return client.settings.findMany({
      where: { ...where, client_id: clientId },
    });
  }

  async upsert(
    clientId: number,
    key: string,
    value: string,
    tx?: TxClient,
  ): Promise<{ id: number; key: string; value: string; client_id: number; created_at: Date; updated_at: Date }> {
    const client = tx ?? prisma;
    return client.settings.upsert({
      where: { client_id_key: { client_id: clientId, key } },
      update: { value },
      create: { client_id: clientId, key, value },
    });
  }

  /** Default 2_000_000 if not set */
  async getDebtLimit(clientId: number, tx?: TxClient): Promise<number> {
    const row = await this.findByKey(clientId, "debt_limit", tx);
    return row ? parseFloat(row.value) : 2000000;
  }

  /** Default 45 if not set */
  async getOverdueDays(clientId: number, tx?: TxClient): Promise<number> {
    const row = await this.findByKey(clientId, "overdue_days", tx);
    return row ? parseInt(row.value, 10) : 45;
  }
}

export const settingsRepository = new SettingsRepository();
