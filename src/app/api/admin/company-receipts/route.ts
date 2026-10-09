import { hasPermission } from "@/lib/security/permission-access";
import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { requireClientId } from "@/lib/tenant";
import { getApiErrorMessage } from "@/lib/errors";
import { companyPaymentService } from "@/lib/services/company-payment.service";
import { companyDebtService } from "@/lib/services/company-debt.service";
import type { Prisma } from "@prisma/client";

type PaymentWithCompany = Prisma.CompanyPaymentGetPayload<{ include: { company: true } }>;
type DebtWithCompany = Prisma.CompanyDebtGetPayload<{ include: { company: true } }>;

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (session && !(await hasPermission(session, "company-receipts.view")))
      return NextResponse.json({ error: "Ruxsat yo‘q" }, { status: 403 });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clientId = requireClientId(session);
    if (session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    }

    const sp = request.nextUrl.searchParams;
    const page = Math.max(1, Number(sp.get("page") || 1));
    const limit = Math.min(100, Math.max(1, Number(sp.get("limit") || 20)));
    const take = page * limit;

    const [paymentsResult, debtsResult] = await Promise.all([
      companyPaymentService.listWithReceipts(clientId, { page: 1, limit: take }),
      companyDebtService.listWithReceipts(clientId, take),
    ]);
    const payments = paymentsResult.rows as PaymentWithCompany[];
    const debts = debtsResult.rows as DebtWithCompany[];
    const total = paymentsResult.total + debtsResult.total;
    const data = [
      ...payments.map((row) => ({
        kind: "PAYMENT" as const,
        id: row.id,
        companyId: row.company_id,
        companyName: row.company.name,
        amount: row.amount.toNumber(),
        note: row.note,
        paymentType: row.payment_type,
        receiptPath: row.receipt_path,
        receiptName: row.receipt_name,
        receiptMime: row.receipt_mime,
        receiptSize: row.receipt_size,
        createdAt: row.created_at,
      })),
      ...debts.map((row) => ({
        kind: "DEBT" as const,
        id: row.id,
        companyId: row.company_id,
        companyName: row.company.name,
        amount: row.amount.toNumber(),
        note: row.note,
        paymentType: null,
        receiptPath: row.receipt_path,
        receiptName: row.receipt_name,
        receiptMime: row.receipt_mime,
        receiptSize: row.receipt_size,
        createdAt: row.created_at,
      })),
    ]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice((page - 1) * limit, page * limit);

    return NextResponse.json({
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    console.error("Error listing company receipts:", error);
    return NextResponse.json({ error: getApiErrorMessage(error) }, { status: 500 });
  }
}
