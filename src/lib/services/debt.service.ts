import { settingsRepository } from "@/entities/settings/api";

class DebtService {
  async debtLimit(clientId: number): Promise<number> {
    return settingsRepository.getDebtLimit(clientId);
  }
}
export const debtService = new DebtService();
