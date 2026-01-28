import { prisma } from "../prisma";
import { getEffectiveShopId } from "../shop-context";
import { getSession } from "../auth";

class DebtService {
  async debtLimit(): Promise<number> {
    const session = await getSession();
    const shopId = getEffectiveShopId(session);

    const settings = await prisma.settings.findFirst({
      where: {
        OR: [
          { shop_id: shopId, key: "debt_limit" },
          { shop_id: null, key: "debt_limit" },
        ],
      },
      orderBy: { shop_id: "desc" },
    });
    return settings ? parseFloat(settings.value) : 2000000;
  }
}

export const debtService = new DebtService();
