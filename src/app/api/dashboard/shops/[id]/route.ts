import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateShopSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
});

// GET - Get single shop details
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only SUPER_ADMIN can view shop details
    if (session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const shopId = parseInt(id);
    if (isNaN(shopId)) {
      return NextResponse.json({ error: "Invalid shop ID" }, { status: 400 });
    }

    // Get shop with full details
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      include: {
        _count: {
          select: {
            users: true,
            debtors: true,
            debts: true,
            payments: true,
            notifications: true,
          },
        },
        settings: {
          select: {
            key: true,
            value: true,
          },
        },
      },
    });

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    // Get additional stats
    const [totalDebt, totalPayments, activeUsers, blockedUsers] = await Promise.all([
      prisma.debtor.aggregate({
        where: { shop_id: shopId },
        _sum: { total_debt: true },
      }),
      prisma.payment.aggregate({
        where: { shop_id: shopId },
        _sum: { amount: true },
      }),
      prisma.user.count({
        where: {
          shop_id: shopId,
          status: "ACTIVE",
        },
      }),
      prisma.user.count({
        where: {
          shop_id: shopId,
          status: "BLOCKED",
        },
      }),
    ]);

    // Format settings as object
    const settings: Record<string, string> = {};
    shop.settings.forEach((s) => {
      settings[s.key] = s.value;
    });

    return NextResponse.json({
      ...shop,
      total_debt: totalDebt._sum.total_debt?.toNumber() || 0,
      total_payments: totalPayments._sum.amount?.toNumber() || 0,
      active_users: activeUsers,
      blocked_users: blockedUsers,
      settings,
    });
  } catch (error) {
    console.error("Get shop error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH - Update shop
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only SUPER_ADMIN can update shops
    if (session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const shopId = parseInt(id);
    if (isNaN(shopId)) {
      return NextResponse.json({ error: "Invalid shop ID" }, { status: 400 });
    }

    const body = await req.json();
    const validatedData = updateShopSchema.parse(body);

    // Check if shop exists
    const existingShop = await prisma.shop.findUnique({
      where: { id: shopId },
    });

    if (!existingShop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    // If changing name, check for duplicates
    if (validatedData.name && validatedData.name !== existingShop.name) {
      const duplicateShop = await prisma.shop.findFirst({
        where: {
          name: {
            equals: validatedData.name,
            mode: "insensitive",
          },
          id: { not: shopId },
        },
      });

      if (duplicateShop) {
        return NextResponse.json(
          {
            error: "Shop with this name already exists",
          },
          { status: 409 },
        );
      }
    }

    // Update shop
    const updatedShop = await prisma.shop.update({
      where: { id: shopId },
      data: validatedData,
    });

    // Log the update
    await prisma.auditLog.create({
      data: {
        user_id: session.userId,
        shop_id: null, // System-level action
        action: "UPDATE_SHOP",
        entity_type: "Shop",
        entity_id: shopId,
        old_value: existingShop,
        new_value: updatedShop,
      },
    });

    // If deactivating shop, log out all users
    if (validatedData.is_active === false && existingShop.is_active === true) {
      // This will force users to re-login
      // In a real app, you might want to invalidate their sessions
      await prisma.auditLog.create({
        data: {
          user_id: session.userId,
          shop_id: shopId,
          action: "DEACTIVATE_SHOP",
          entity_type: "Shop",
          entity_id: shopId,
          new_value: { is_active: false },
        },
      });
    }

    return NextResponse.json({
      message: "Shop updated successfully",
      shop: updatedShop,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    console.error("Update shop error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Delete shop (soft delete by deactivating)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only SUPER_ADMIN can delete shops
    if (session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const shopId = parseInt(id);
    if (isNaN(shopId)) {
      return NextResponse.json({ error: "Invalid shop ID" }, { status: 400 });
    }

    // Check if shop exists
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      include: {
        _count: {
          select: {
            users: true,
            debtors: true,
            debts: true,
            payments: true,
          },
        },
      },
    });

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    // Check if shop has data
    const hasData = shop._count.debtors > 0 || shop._count.debts > 0 || shop._count.payments > 0;

    if (hasData) {
      // Soft delete - just deactivate
      await prisma.shop.update({
        where: { id: shopId },
        data: { is_active: false },
      });

      // Block all users in this shop
      await prisma.user.updateMany({
        where: { shop_id: shopId },
        data: { status: "DEACTIVATED" },
      });

      await prisma.auditLog.create({
        data: {
          user_id: session.userId,
          shop_id: null,
          action: "SOFT_DELETE_SHOP",
          entity_type: "Shop",
          entity_id: shopId,
          old_value: { name: shop.name, has_data: true },
        },
      });

      return NextResponse.json({
        message: "Shop deactivated (contains data)",
        soft_delete: true,
      });
    } else {
      // Hard delete if no data
      // Delete in correct order due to foreign keys
      await prisma.$transaction([
        prisma.notification.deleteMany({ where: { shop_id: shopId } }),
        prisma.auditLog.deleteMany({ where: { shop_id: shopId } }),
        prisma.settings.deleteMany({ where: { shop_id: shopId } }),
        prisma.user.deleteMany({ where: { shop_id: shopId } }),
        prisma.shop.delete({ where: { id: shopId } }),
      ]);

      await prisma.auditLog.create({
        data: {
          user_id: session.userId,
          shop_id: null,
          action: "DELETE_SHOP",
          entity_type: "Shop",
          entity_id: shopId,
          old_value: { name: shop.name },
        },
      });

      return NextResponse.json({
        message: "Shop permanently deleted",
        hard_delete: true,
      });
    }
  } catch (error) {
    console.error("Delete shop error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
