import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { getApiErrorMessage } from "@/lib/errors";
import { Prisma } from "@prisma/client";
import { debtorRepository } from "@/entities/debtor/api";
import { settingsRepository } from "@/entities/settings/api";

type ExportData = {
  id: number | string;
  first_name: string;
  last_name: string;
  phone_number: string;
  address: string;
  total_debt: number;
  total_debts: number;
  total_payments: number;
  status: string;
  created_at: string;
};

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
    const debtLimit = await settingsRepository.getDebtLimit(session.shopId ?? null);

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
      where.total_debt = { gt: 0, lt: debtLimit }; // 0 < total_debt < debtLimit
    } else if (status === "limitdan_oshgan") {
      where.total_debt = { gte: debtLimit }; // total_debt >= debtLimit (teng bo'lsa ham)
    } else if (status === "tolangan") {
      where.total_debt = { lte: 0 };
    }

    const debtors = await debtorRepository.findMany(where, {
      orderBy: { created_at: "desc" },
      include: { debts: true, payments: true },
    });

    const exportData: ExportData[] = debtors.map((debtor) => {
      const totalDebt = (debtor as { total_debt: { toNumber: () => number } }).total_debt.toNumber();
      const totalDebts = (debtor.debts ?? []).reduce(
        (sum, d) => sum + (d as { amount: { toNumber: () => number } }).amount.toNumber(),
        0,
      );
      const totalPayments = (debtor.payments ?? []).reduce(
        (sum, p) => sum + (p as { amount: { toNumber: () => number } }).amount.toNumber(),
        0,
      );

      let status = "To'langan";
      if (totalDebt > debtLimit) {
        status = "Limitdan oshgan";
      } else if (totalDebt > 0) {
        status = "Qarzdor";
      }

      const d = debtor as {
        id: number;
        first_name: string;
        last_name: string;
        phone_number: string | null;
        address: string | null;
        created_at: Date;
      };
      return {
        id: d.id,
        first_name: d.first_name,
        last_name: d.last_name,
        phone_number: d.phone_number || "",
        address: d.address || "",
        total_debt: totalDebt,
        total_debts: totalDebts,
        total_payments: totalPayments,
        status,
        created_at: d.created_at.toLocaleDateString("uz-UZ"),
      };
    });

    exportData.push({
      id: "Ja'mi",
      first_name: "",
      last_name: "",
      phone_number: "",
      address: "",
      total_debt: exportData.reduce((sum, debtor) => sum + debtor.total_debt, 0),
      total_debts: exportData.reduce((sum, debtor) => sum + debtor.total_debts, 0),
      total_payments: exportData.reduce((sum, debtor) => sum + debtor.total_payments, 0),
      status: "",
      created_at: "",
    });

    return NextResponse.json({ debtors: exportData });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: getApiErrorMessage(error) }, { status: 500 });
  }
}
