import { hasPermission } from "@/lib/security/permission-access";
import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";

import { getSession } from "@/lib/auth";
import { requireClientId } from "@/lib/tenant";
import { getApiErrorMessage } from "@/lib/errors";
import { companyPaymentService } from "@/lib/services/company-payment.service";
import { companyDebtService } from "@/lib/services/company-debt.service";
import { deleteCompanyReceiptFile, getCompanyReceiptAbsolutePath } from "@/lib/companies/receipt-storage";
import { buildCompanyDebtReceiptFileName, buildCompanyReceiptFileName } from "@/lib/companies/receipt-display";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { id } = await params;
    const recordId = parseInt(id, 10);
    if (isNaN(recordId)) {
      return NextResponse.json({ error: "Noto'g'ri ID" }, { status: 400 });
    }

    const isDebt = request.nextUrl.searchParams.get("kind") === "DEBT";
    const record = isDebt
      ? await companyDebtService.findById(clientId, recordId)
      : await companyPaymentService.findById(clientId, recordId);
    if (!record?.receiptPath) {
      return NextResponse.json({ error: "Chek topilmadi" }, { status: 404 });
    }

    const absolute = getCompanyReceiptAbsolutePath(record.receiptPath);
    const buffer = await readFile(absolute);
    const filename = isDebt
      ? buildCompanyDebtReceiptFileName({
          companyName: record.company?.name || "kompaniya",
          debtId: record.id,
          date: record.createdAt,
          mime: record.receiptMime,
          receiptPath: record.receiptPath,
        })
      : buildCompanyReceiptFileName({
          companyName: record.company?.name || "kompaniya",
          paymentId: record.id,
          date: record.createdAt,
          mime: record.receiptMime,
          receiptPath: record.receiptPath,
        });

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": record.receiptMime || "application/octet-stream",
        "Content-Disposition": `inline; filename="${filename.replace(/"/g, "")}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Error reading company receipt:", error);
    return NextResponse.json({ error: getApiErrorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (session && !(await hasPermission(session, "company-receipts.delete")))
      return NextResponse.json({ error: "Ruxsat yo‘q" }, { status: 403 });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clientId = requireClientId(session);
    if (session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    }

    const { id } = await params;
    const recordId = parseInt(id, 10);
    if (isNaN(recordId)) {
      return NextResponse.json({ error: "Noto'g'ri ID" }, { status: 400 });
    }

    const isDebt = request.nextUrl.searchParams.get("kind") === "DEBT";
    const record = isDebt
      ? await companyDebtService.findById(clientId, recordId)
      : await companyPaymentService.findById(clientId, recordId);
    if (!record) {
      return NextResponse.json({ error: isDebt ? "Qarz topilmadi" : "To'lov topilmadi" }, { status: 404 });
    }

    const deletedPath = isDebt
      ? await companyDebtService.removeReceipt(clientId, recordId, session.userId)
      : await companyPaymentService.removeReceipt(clientId, recordId, session.userId);
    await deleteCompanyReceiptFile(deletedPath);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting company receipt:", error);
    return NextResponse.json({ error: getApiErrorMessage(error) }, { status: 500 });
  }
}
