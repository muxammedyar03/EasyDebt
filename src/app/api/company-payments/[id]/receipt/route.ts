import { hasPermission } from "@/lib/security/permission-access";
import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";

import { getSession } from "@/lib/auth";
import { requireClientId } from "@/lib/tenant";
import { getApiErrorMessage } from "@/lib/errors";
import { companyPaymentService } from "@/lib/services/company-payment.service";
import { getCompanyReceiptAbsolutePath } from "@/lib/companies/receipt-storage";
import { buildCompanyReceiptFileName } from "@/lib/companies/receipt-display";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (session && !(await hasPermission(session, "companies.view")))
      return NextResponse.json({ error: "Ruxsat yo‘q" }, { status: 403 });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clientId = requireClientId(session);

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
    const download = request.nextUrl.searchParams.get("download") === "1";
    const disposition = download ? "attachment" : "inline";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": payment.receiptMime || "application/octet-stream",
        "Content-Disposition": `${disposition}; filename="${filename.replace(/"/g, "")}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Error reading company payment receipt:", error);
    return NextResponse.json({ error: getApiErrorMessage(error) }, { status: 500 });
  }
}
