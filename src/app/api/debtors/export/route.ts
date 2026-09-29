import { hasPermission } from "@/lib/security/permission-access";
import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { requireClientId } from "@/lib/tenant";
import { getApiErrorMessage } from "@/lib/errors";
import { Prisma } from "@prisma/client";
import { debtorRepository } from "@/entities/debtor/api";
import { settingsRepository } from "@/entities/settings/api";

/** Safely convert Prisma Decimal or number to number (works in all build/runtime envs). */
function toNum(value: unknown): number {
  if (typeof value === "number") return value;
  const v = value as { toNumber?: () => number } | null | undefined;
  return typeof v?.toNumber === "function" ? v.toNumber() : 0;
}

type DebtWithAmount = { amount: unknown };
type PaymentWithAmount = { amount: unknown };
type DebtorForExport = {
  id: number;
  first_name: string;
  last_name: string;
  phone_number: string | null;
  address: string | null;
  total_debt: unknown;
  created_at: Date;
  debts?: DebtWithAmount[];
  payments?: PaymentWithAmount[];
};

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
    if (session && !(await hasPermission(session, "debtors.export"))) return NextResponse.json({ error: "Ruxsat yo‘q" }, { status: 403 });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clientId = requireClientId(session);

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "all";

    // Get debt limit from settings
    const debtLimit = await settingsRepository.getDebtLimit(clientId);

    // Build where clause
    const where: Prisma.DebtorWhereInput = { client_id: clientId };

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

    const exportData: ExportData[] = debtors.map((debtor: DebtorForExport) => {
      const totalDebt = toNum(debtor.total_debt);
      const totalDebts = (debtor.debts ?? []).reduce((sum: number, d: DebtWithAmount) => sum + toNum(d.amount), 0);
      const totalPayments = (debtor.payments ?? []).reduce(
        (sum: number, p: PaymentWithAmount) => sum + toNum(p.amount),
        0,
      );

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

