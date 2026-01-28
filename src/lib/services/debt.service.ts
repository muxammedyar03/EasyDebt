import { prisma } from "../prisma";

class DebtService {
  async debtLimit(): Promise<number> {
    const settings = await prisma.settings.findUnique({
      where: { key: "debt_limit" },
    });
    return settings ? parseFloat(settings.value) : 2000000;
  }
}

export const debtService = new DebtService();
