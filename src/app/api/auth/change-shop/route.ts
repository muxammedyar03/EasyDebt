import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession, setAuthCookie, signToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const changeShopSchema = z.object({
  shopId: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  try {
    // Get current session
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only SUPER_ADMIN can change shops
    if (session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden. Only Super Admin can change shops." }, { status: 403 });
    }

    // Parse request body
    const body = await req.json();
    const validatedData = changeShopSchema.parse(body);

    // Check if shop exists and is active
    const shop = await prisma.shop.findUnique({
      where: { id: validatedData.shopId },
      select: {
        id: true,
        name: true,
        is_active: true,
      },
    });

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    // Super Admin can access inactive shops (for maintenance)
    // But we'll send a warning
    const warning = !shop.is_active ? "Warning: This shop is inactive" : null;

    // Generate new token with updated activeShopId
    const newToken = await signToken({
      userId: session.userId,
      username: session.username,
      email: session.email,
      role: session.role,
      shopId: session.shopId, // This stays null for SUPER_ADMIN
      activeShopId: shop.id, // Update active shop
      status: session.status,
    });

    // Set new cookie
    await setAuthCookie(newToken);

    // Log the shop change for audit
    await prisma.auditLog.create({
      data: {
        user_id: session.userId,
        shop_id: null, // This is a system-level action
        action: "CHANGE_SHOP",
        entity_type: "Shop",
        entity_id: shop.id,
        old_value: session.activeShopId ? { shopId: session.activeShopId } : "",
        new_value: { shopId: shop.id },
      },
    });

    return NextResponse.json({
      message: "Shop changed successfully",
      shop: {
        id: shop.id,
        name: shop.name,
        is_active: shop.is_active,
      },
      warning,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 });
    }

    console.error("Change shop error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Get current session
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only SUPER_ADMIN can list shops for switching
    if (session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get all shops with stats
    const shops = await prisma.shop.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        is_active: true,
        address: true,
        phone: true,
        _count: {
          select: {
            users: true,
            debtors: true,
          },
        },
      },
    });

    // Add total debt for each shop
    const shopsWithStats = await Promise.all(
      shops.map(async (shop) => {
        const totalDebt = await prisma.debtor.aggregate({
          where: { shop_id: shop.id },
          _sum: { total_debt: true },
        });

        return {
          ...shop,
          total_debt: totalDebt._sum.total_debt?.toNumber() || 0,
          is_current: shop.id === session.activeShopId,
        };
      }),
    );

    return NextResponse.json({
      shops: shopsWithStats,
      current_shop_id: session.activeShopId,
    });
  } catch (error) {
    console.error("Get shops error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
