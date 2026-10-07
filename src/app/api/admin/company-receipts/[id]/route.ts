import { hasPermission } from "@/lib/security/permission-access";
import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";

import { getSession } from "@/lib/auth";
import { requireClientId } from "@/lib/tenant";
import { getApiErrorMessage } from "@/lib/errors";
import { companyPaymentService } from "@/lib/services/company-payment.service";
import { deleteCompanyReceiptFile, getCompanyReceiptAbsolutePath } from "@/lib/companies/receipt-storage";
import { buildCompanyReceiptFileName } from "@/lib/companies/receipt-display";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    const paymentId = parseInt(id, 10);
    if (isNaN(paymentId)) {
      return NextResponse.json({ error: "Noto'g'ri ID" }, { status: 400 });
    }

    const payment = await companyPaymentService.findById(clientId, paymentId);
    if (!payment?.receiptPath) {
      return NextResponse.json({ error: "Chek topilmadi" }, { status: 404 });
    }

    const absolute = getCompanyReceiptAbsolutePath(payment.receiptPath);
    const buffer = await readFile(absolute);
    const filename = buildCompanyReceiptFileName({
      companyName: payment.company?.name || "kompaniya",
      paymentId: payment.id,
      date: payment.createdAt,
      mime: payment.receiptMime,
      receiptPath: payment.receiptPath,
    });

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": payment.receiptMime || "application/octet-stream",
        "Content-Disposition": `inline; filename="${filename.replace(/"/g, "")}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Error reading company receipt:", error);
    return NextResponse.json({ error: getApiErrorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    const paymentId = parseInt(id, 10);
    if (isNaN(paymentId)) {
      return NextResponse.json({ error: "Noto'g'ri ID" }, { status: 400 });
    }

    const payment = await companyPaymentService.findById(clientId, paymentId);
    if (!payment) {
      return NextResponse.json({ error: "To'lov topilmadi" }, { status: 404 });
    }

    const deletedPath = await companyPaymentService.removeReceipt(clientId, paymentId, session.userId);
    await deleteCompanyReceiptFile(deletedPath);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting company receipt:", error);
    return NextResponse.json({ error: getApiErrorMessage(error) }, { status: 500 });
  }
}
