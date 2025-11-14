import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiKey } from "@/lib/api-key";
import { PaymentType } from "@prisma/client";

function getTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export async function GET(request: NextRequest) {
  // API key check (for n8n integration)
  const unauthorized = requireApiKey(request);
  if (unauthorized) return unauthorized;

  const { start, end } = getTodayRange();

  try {
    const [debtsAgg, debtorsDistinct, paymentsAgg, paymentsGroup] = await Promise.all([
      prisma.debt.aggregate({
        _count: { _all: true },
        _sum: { amount: true },
        where: { created_at: { gte: start, lte: end } },
      }),
      prisma.debt.findMany({
        where: { created_at: { gte: start, lte: end } },
        select: { debtor_id: true },
        distinct: ["debtor_id"],
      }),
      prisma.payment.aggregate({
        _count: { _all: true },
        _sum: { amount: true },
        where: { created_at: { gte: start, lte: end } },
      }),
      prisma.payment.groupBy({
        by: ["payment_type"],
        where: { created_at: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
    ]);

    const paymentByType: Record<string, string> = { click: "0", card: "0", naqt: "0" };

    for (const row of paymentsGroup) {
      const sum = row._sum.amount ?? (0 as number);
      const asNumber = typeof sum === "number" ? sum : Number(sum);
      if (row.payment_type === PaymentType.CLICK) paymentByType.click = asNumber.toString();
      if (row.payment_type === PaymentType.CARD) paymentByType.card = asNumber.toString();
      if (row.payment_type === PaymentType.CASH) paymentByType.naqt = asNumber.toString();
    }

    const debtsSum = debtsAgg._sum.amount ?? (0 as number);
    const paymentsSum = paymentsAgg._sum.amount ?? (0 as number);

    const result = {
      date: new Date().toISOString().slice(0, 10),
      debts: {
        count: debtsAgg._count._all || 0,
        sum: (typeof debtsSum === "number" ? debtsSum : Number(debtsSum)).toString(),
      },
      debtors: {
        count: debtorsDistinct.length,
      },
      payments: {
        count: paymentsAgg._count._all || 0,
        sum: (typeof paymentsSum === "number" ? paymentsSum : Number(paymentsSum)).toString(),
        by_type: {
          click: paymentByType.click,
          card: paymentByType.card,
          naqt: paymentByType.naqt,
        },
      },
      window: { start, end },
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to load today's stats:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
