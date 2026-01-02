import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await getSession();

    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only SUPER_ADMIN can access
    if (payload.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { id } = await params;
    const shopId = parseInt(id);

    if (isNaN(shopId)) {
      return NextResponse.json({ error: "Invalid shop ID" }, { status: 400 });
    }

    // Check if shop exists
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
    });

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get today's debts
    const todayDebtsResult = await prisma.debt.aggregate({
      where: {
        shop_id: shopId,
        created_at: {
          gte: today,
          lt: tomorrow,
        },
      },
      _sum: {
        amount: true,
      },
    });

    // Get today's payments
    const todayPaymentsResult = await prisma.payment.aggregate({
      where: {
        shop_id: shopId,
        created_at: {
          gte: today,
          lt: tomorrow,
        },
      },
      _sum: {
        amount: true,
      },
    });

    // Get total debt
    const totalDebtResult = await prisma.debt.aggregate({
      where: {
        shop_id: shopId,
      },
      _sum: {
        amount: true,
      },
    });

    // Get total payments
    const totalPaymentsResult = await prisma.payment.aggregate({
      where: {
        shop_id: shopId,
      },
      _sum: {
        amount: true,
      },
    });

    // Get users count
    const totalUsers = await prisma.user.count({
      where: { shop_id: shopId },
    });

    const activeUsers = await prisma.user.count({
      where: {
        shop_id: shopId,
        status: "ACTIVE",
      },
    });

    // Get debtors count
    const debtorsCount = await prisma.debtor.count({
      where: { shop_id: shopId },
    });

    return NextResponse.json({
      todayDebts: Number(todayDebtsResult._sum.amount || 0),
      todayPayments: Number(todayPaymentsResult._sum.amount || 0),
      totalDebt: Number(totalDebtResult._sum.amount || 0),
      totalPayments: Number(totalPaymentsResult._sum.amount || 0),
      activeUsers,
      totalUsers,
      debtorsCount,
    });
  } catch (error) {
    console.error("Error fetching shop stats:", error);
    return NextResponse.json({ error: "Failed to fetch shop statistics" }, { status: 500 });
  }
}
