import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { getApiErrorMessage } from "@/lib/errors";
import { companyPaymentService } from "@/lib/services/company-payment.service";
import { prismaToDomainCompanyPayment } from "@/lib/mappers/company.mapper";
import type { Prisma } from "@prisma/client";

type PaymentWithCompany = Prisma.CompanyPaymentGetPayload<{ include: { company: true } }>;

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    }

    const sp = request.nextUrl.searchParams;
    const page = Number(sp.get("page") || 1);
    const limit = Number(sp.get("limit") || 20);

    const result = await companyPaymentService.listWithReceipts({ page, limit });
    const rows = result.rows as PaymentWithCompany[];

    return NextResponse.json({
      data: rows.map((row) => ({
        ...prismaToDomainCompanyPayment(row),
        companyName: row.company?.name ?? "—",
      })),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    });
  } catch (error) {
    console.error("Error listing company receipts:", error);
    return NextResponse.json({ error: getApiErrorMessage(error) }, { status: 500 });
  }
}
