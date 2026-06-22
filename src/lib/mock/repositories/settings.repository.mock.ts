import type { Prisma } from "@prisma/client";
import { getMockStore } from "../mock-store";

export class MockSettingsRepository {
  async findByKey(key: string) {
    return getMockStore().settings.find((s) => s.key === key) ?? null;
  }

  async findMany(where?: Prisma.SettingsWhereInput) {
    const rows = getMockStore().settings;
    if (!where?.key) return rows;
    return rows.filter((s) => s.key === where.key);
  }

  async upsert(key: string, value: string) {
    const store = getMockStore();
    const idx = store.settings.findIndex((s) => s.key === key);
    const now = new Date();
    if (idx >= 0) {
      store.settings[idx] = { ...store.settings[idx], value, updated_at: now };
      return store.settings[idx];
    }
    const row = { id: store.settings.length + 1, key, value, created_at: now, updated_at: now };
    store.settings.push(row);
    return row;
  }

  async getDebtLimit() {
    const row = await this.findByKey("debt_limit");
    return row ? parseFloat(row.value) : 2_000_000;
  }

  async getOverdueDays() {
    const row = await this.findByKey("overdue_days");
    return row ? parseInt(row.value, 10) : 45;
  }
}

export const mockSettingsRepository = new MockSettingsRepository();
