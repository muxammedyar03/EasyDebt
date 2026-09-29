import { hasPermission } from "@/lib/security/permission-access";
import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { requireClientId } from "@/lib/tenant";
import { getApiErrorMessage } from "@/lib/errors";
import { companyService } from "@/lib/services/company.service";
import type { CompanyFilterStatus } from "@/types/domain/company.domain";
import type { CompaniesExportApiResponse } from "@/types/api/companies-export";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (session && !(await hasPermission(session, "companies.export"))) return NextResponse.json({ error: "Ruxsat yo‘q" }, { status: 403 });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clientId = requireClientId(session);

    const sp = request.nextUrl.searchParams;
    const search = sp.get("search") || undefined;
    const status = (sp.get("status") as CompanyFilterStatus) || "all";

    const result = await companyService.findMany(
      clientId,
      { search, status },
      { page: 1, limit: 5000, sortBy: "name", sortOrder: "asc" },
    );

    const companies = result.data.map((c) => {
      const totalDebts = c.debts?.reduce((s, d) => s + d.amount, 0) ?? 0;
      const totalPayments = c.payments?.reduce((s, p) => s + p.amount, 0) ?? 0;
      return {
        id: c.id,
        name: c.name,
        contact_person: c.contactPerson || "",
        phone_number: c.phoneNumber || "",
        address: c.address || "",
        total_debt: c.totalDebt,
        total_debts: totalDebts,
        total_payments: totalPayments,
        status: c.status,
        created_at: c.createdAt.toISOString(),
      };
    });

    const payload: CompaniesExportApiResponse = { companies };
    return NextResponse.json(payload);
  } catch (error) {
    console.error("Error exporting companies:", error);
    return NextResponse.json({ error: getApiErrorMessage(error) }, { status: 500 });
  }
}

