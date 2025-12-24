import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// Validation schemas
const createShopSchema = z.object({
  name: z.string().min(1).max(100),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
});

// GET - List all shops with stats
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only SUPER_ADMIN can manage shops
    if (session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get query params for filtering
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status"); // active, inactive, all
    const search = searchParams.get("search");

    // Build where clause
    const where: Prisma.ShopWhereInput = {};

    if (status === "active") {
      where.is_active = true;
    } else if (status === "inactive") {
      where.is_active = false;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { address: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    // Get shops with counts
    const shops = await prisma.shop.findMany({
      where,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        is_active: true,
        created_at: true,
        updated_at: true,
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

    // Get total debt for each shop
    const shopsWithStats = await Promise.all(
      shops.map(async (shop) => {
        const [totalDebt, totalPayments] = await Promise.all([
          prisma.debtor.aggregate({
            where: { shop_id: shop.id },
            _sum: { total_debt: true },
          }),
          prisma.payment.aggregate({
            where: { shop_id: shop.id },
            _sum: { amount: true },
          }),
        ]);

        // Get active users count
        const activeUsers = await prisma.user.count({
          where: {
            shop_id: shop.id,
            status: "ACTIVE",
          },
        });

        return {
          ...shop,
          total_debt: totalDebt._sum.total_debt?.toNumber() || 0,
          total_payments: totalPayments._sum.amount?.toNumber() || 0,
          active_users: activeUsers,
          total_users: shop._count.users,
        };
      }),
    );

    return NextResponse.json({
      shops: shopsWithStats,
      total: shopsWithStats.length,
    });
  } catch (error) {
    console.error("Get shops error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Create new shop
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only SUPER_ADMIN can create shops
    if (session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const validatedData = createShopSchema.parse(body);

    // Check if shop name already exists
    const existingShop = await prisma.shop.findFirst({
      where: {
        name: {
          equals: validatedData.name,
          mode: "insensitive",
        },
      },
    });

    if (existingShop) {
      return NextResponse.json(
        {
          error: "Shop with this name already exists",
        },
        { status: 409 },
      );
    }

    // Create shop
    const newShop = await prisma.shop.create({
      data: {
        name: validatedData.name,
        address: validatedData.address,
        phone: validatedData.phone,
        is_active: validatedData.is_active,
      },
    });

    // Create default settings for the shop
    await prisma.settings.createMany({
      data: [
        {
          shop_id: newShop.id,
          key: "debt_limit",
          value: "5000000",
        },
        {
          shop_id: newShop.id,
          key: "overdue_days",
          value: "30",
        },
        {
          shop_id: newShop.id,
          key: "notification_enabled",
          value: "true",
        },
      ],
    });

    // Log creation
    await prisma.auditLog.create({
      data: {
        user_id: session.userId,
        shop_id: null, // System-level action
        action: "CREATE_SHOP",
        entity_type: "Shop",
        entity_id: newShop.id,
        new_value: {
          name: newShop.name,
          is_active: newShop.is_active,
        },
      },
    });

    return NextResponse.json(
      {
        message: "Shop created successfully",
        shop: newShop,
      },
      { status: 201 },
    );
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

    console.error("Create shop error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
