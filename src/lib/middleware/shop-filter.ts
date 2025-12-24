import { PrismaClient, UserRole } from "@prisma/client";

/**
 * Shop-based data isolation middleware
 * Barcha query'larga avtomatik shop_id filter qo'shadi
 */
export interface UserContext {
  id: number;
  role: UserRole;
  shopId: number | null;
}

/**
 * Prisma query'ga shop filter qo'shish
 */
export function applyShopFilter<T extends { where?: Record<string, unknown> }>(query: T, user: UserContext): T {
  // Super Admin barcha ma'lumotlarni ko'ra oladi
  if (user.role === "SUPER_ADMIN") {
    return query;
  }

  // Admin va User faqat o'z shop'idagi ma'lumotlarni ko'radi
  if (user.shopId) {
    if (!query.where) {
      query.where = {} as T["where"];
    }
    (query.where as Record<string, unknown>).shop_id = user.shopId;
  }

  return query;
}

/**
 * Create/Update operatsiyalari uchun shop_id qo'shish
 */
export function applyShopContext<T extends Record<string, unknown>>(
  data: T,
  user: UserContext,
): T & { shop_id?: number } {
  // Super Admin istagan shopga ma'lumot qo'sha oladi
  if (user.role === "SUPER_ADMIN") {
    return data;
  }

  // Admin va User faqat o'z shop'iga ma'lumot qo'shadi
  if (user.shopId) {
    return {
      ...data,
      shop_id: user.shopId,
    };
  }

  return data;
}

/**
 * Shop access tekshirish
 */
export function canAccessShop(user: UserContext, shopId: number): boolean {
  // Super Admin barcha shoplarga kira oladi
  if (user.role === "SUPER_ADMIN") {
    return true;
  }

  // Admin va User faqat o'z shop'iga kira oladi
  return user.shopId === shopId;
}

/**
 * User management access tekshirish
 */
export function canManageUsers(user: UserContext): boolean {
  return user.role === "SUPER_ADMIN" || user.role === "ADMIN";
}

/**
 * Shop management access tekshirish
 */
export function canManageShops(user: UserContext): boolean {
  return user.role === "SUPER_ADMIN";
}

/**
 * Blocked/Deactivated shop tekshirish
 */
export async function isShopActive(prisma: Pick<PrismaClient, "shop">, shopId: number | null): Promise<boolean> {
  if (!shopId) return true; // Super Admin uchun

  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { is_active: true },
  });

  return shop?.is_active ?? false;
}
