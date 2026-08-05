import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";

import { getSession } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { getApiErrorMessage } from "@/lib/errors";
import { companyPaymentService } from "@/lib/services/company-payment.service";
import { deleteCompanyReceiptFile, getCompanyReceiptAbsolutePath } from "@/lib/companies/receipt-storage";
import { buildCompanyReceiptFileName } from "@/lib/companies/receipt-display";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    }

    const { id } = await params;
    const paymentId = parseInt(id, 10);
    if (isNaN(paymentId)) {
      return NextResponse.json({ error: "Noto'g'ri ID" }, { status: 400 });
    }

    const payment = await companyPaymentService.findById(paymentId);
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

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    }

    const { id } = await params;
    const paymentId = parseInt(id, 10);
    if (isNaN(paymentId)) {
      return NextResponse.json({ error: "Noto'g'ri ID" }, { status: 400 });
    }

    const payment = await companyPaymentService.findById(paymentId);
    if (!payment) {
      return NextResponse.json({ error: "To'lov topilmadi" }, { status: 404 });
    }

    await deleteCompanyReceiptFile(payment.receiptPath);
    await companyPaymentService.update(paymentId, {
      receiptPath: null,
      receiptName: null,
      receiptMime: null,
      receiptSize: null,
    });

    await createAuditLog({
      userId: session.userId,
      action: "DELETE",
      entityType: "COMPANY_PAYMENT_RECEIPT",
      entityId: paymentId,
      oldValue: { receipt_path: payment.receiptPath },
      description: `Kompaniya to'lov cheki #${paymentId} o'chirildi`,
      ipAddress: request.headers.get("cf-connecting-ip") || "",
      userAgent: request.headers.get("user-agent") || "",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting company receipt:", error);
    return NextResponse.json({ error: getApiErrorMessage(error) }, { status: 500 });
  }
}
