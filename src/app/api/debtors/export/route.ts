import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { getApiErrorMessage } from "@/lib/errors";
import { debtorService } from "@/lib/services/debtor.service";
import { debtService } from "@/lib/services/debt.service";
import { parseDebtorsSearchParams } from "@/lib/debtors/debtors-list-filters";
import { t } from "@/lib/i18n";

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

function getExportStatus(totalDebt: number, debtLimit: number): string {
  if (totalDebt <= 0) return t("debtors.paid");
  if (totalDebt >= debtLimit) return t("debtors.overLimit");
  return t("debtors.debtorStatus");
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });

    const debtLimit = await debtService.debtLimit();
    const { filters, listOptions } = parseDebtorsSearchParams(params, debtLimit);
    const debtors = await debtorService.findAllFiltered(filters, listOptions);

    const exportData: ExportData[] = debtors.map((debtor) => {
      const totalDebts = debtor.debts?.reduce((sum, d) => sum + d.amount, 0) ?? 0;
      const totalPayments = debtor.payments?.reduce((sum, p) => sum + p.amount, 0) ?? 0;

      return {
        id: debtor.id,
        first_name: debtor.firstName,
        last_name: debtor.lastName,
        phone_number: debtor.phoneNumber || "",
        address: debtor.address || "",
        total_debt: debtor.totalDebt,
        total_debts: totalDebts,
        total_payments: totalPayments,
        status: getExportStatus(debtor.totalDebt, debtLimit),
        created_at: debtor.createdAt.toLocaleDateString("ru-RU"),
      };
    });

    exportData.push({
      id: t("reports.total"),
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
