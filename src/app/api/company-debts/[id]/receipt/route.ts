import { hasPermission } from "@/lib/security/permission-access";
import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";

import { getSession } from "@/lib/auth";
import { requireClientId } from "@/lib/tenant";
import { getApiErrorMessage } from "@/lib/errors";
import { companyDebtService } from "@/lib/services/company-debt.service";
import { getCompanyReceiptAbsolutePath } from "@/lib/companies/receipt-storage";
import { buildCompanyDebtReceiptFileName } from "@/lib/companies/receipt-display";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (session && !(await hasPermission(session, "companies.view")))
      return NextResponse.json({ error: "Ruxsat yo‘q" }, { status: 403 });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const clientId = requireClientId(session);
    const { id } = await params;
    const debtId = Number.parseInt(id, 10);
    if (Number.isNaN(debtId)) return NextResponse.json({ error: "Noto'g'ri ID" }, { status: 400 });

    const debt = await companyDebtService.findById(clientId, debtId);
    if (!debt?.receiptPath) return NextResponse.json({ error: "Hujjat topilmadi" }, { status: 404 });

    const buffer = await readFile(getCompanyReceiptAbsolutePath(debt.receiptPath));
    const filename = buildCompanyDebtReceiptFileName({
      companyName: debt.company?.name || "kompaniya",
      debtId: debt.id,
      date: debt.createdAt,
      mime: debt.receiptMime,
      receiptPath: debt.receiptPath,
    });
    const disposition = request.nextUrl.searchParams.get("download") === "1" ? "attachment" : "inline";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": debt.receiptMime || "application/octet-stream",
        "Content-Disposition": `${disposition}; filename="${filename.replace(/"/g, "")}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Error reading company debt receipt:", error);
    return NextResponse.json({ error: getApiErrorMessage(error) }, { status: 500 });
  }
}
