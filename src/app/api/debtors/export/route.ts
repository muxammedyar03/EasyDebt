import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "all";

    // Get debt limit from settings
    const debtLimitSetting = await prisma.settings.findUnique({
      where: { key: "debt_limit" },
    });
    const debtLimit = debtLimitSetting ? parseFloat(debtLimitSetting.value) : 2000000;

    // Build where clause
    const where: Prisma.DebtorWhereInput = {};

    if (search) {
      where.OR = [
        { first_name: { contains: search, mode: "insensitive" } },
        { last_name: { contains: search, mode: "insensitive" } },
        { phone_number: { contains: search } },
      ];
    }

    // Status filter
    if (status === "qarzdor") {
      where.total_debt = { gt: 0, lte: debtLimit };
    } else if (status === "limitdan_oshgan") {
      where.total_debt = { gt: debtLimit };
    } else if (status === "tolangan") {
      where.total_debt = { lte: 0 };
    }

    // Fetch all debtors (no pagination for export)
    const debtors = await prisma.debtor.findMany({
      where,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        phone_number: true,
        address: true,
        total_debt: true,
        created_at: true,
        debts: {
          select: {
            amount: true,
          },
        },
        payments: {
          select: {
            amount: true,
          },
        },
      },
    });

    // Format data for export
    const exportData = debtors.map((debtor) => {
      const totalDebt = debtor.total_debt.toNumber();
      const totalDebts = debtor.debts.reduce((sum, debt) => sum + debt.amount.toNumber(), 0);
      const totalPayments = debtor.payments.reduce((sum, payment) => sum + payment.amount.toNumber(), 0);

      let status = "To'langan";
      if (totalDebt > debtLimit) {
        status = "Limitdan oshgan";
      } else if (totalDebt > 0) {
        status = "Qarzdor";
      }

      return {
        id: debtor.id,
        first_name: debtor.first_name,
        last_name: debtor.last_name,
        phone_number: debtor.phone_number || "",
        address: debtor.address || "",
        total_debt: totalDebt,
        total_debts: totalDebts,
        total_payments: totalPayments,
        status,
        created_at: debtor.created_at.toLocaleDateString("uz-UZ"),
      };
    });

    return NextResponse.json({ debtors: exportData });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
