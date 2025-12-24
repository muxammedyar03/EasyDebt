import { UserRole } from "@prisma/client";
import { JWTPayload } from "./auth";

/**
 * Get effective shop ID for the current user
 * SUPER_ADMIN uses activeShopId, others use shopId
 */
export function getEffectiveShopId(session: JWTPayload | null): number | null {
  if (!session) return null;

  // Super Admin uses activeShopId (currently selected shop)
  if (session.role === "SUPER_ADMIN") {
    return session.activeShopId || null;
  }

  // Admin and User use their permanent shopId
  return session.shopId;
}

/**
 * Check if user can switch shops
 */
export function canSwitchShops(role: UserRole): boolean {
  return role === "SUPER_ADMIN";
}

/**
 * Build shop filter for Prisma queries
 */
export function buildShopFilter(session: JWTPayload | null) {
  const shopId = getEffectiveShopId(session);

  // If no shop context, return empty filter (for SUPER_ADMIN without active shop)
  if (!shopId) {
    return {};
  }

  return { shop_id: shopId };
}

/**
 * Check if user needs to select a shop
 */
export function needsShopSelection(session: JWTPayload | null): boolean {
  if (!session) return false;

  // Only SUPER_ADMIN without activeShopId needs to select
  return session.role === "SUPER_ADMIN" && !session.activeShopId;
}
