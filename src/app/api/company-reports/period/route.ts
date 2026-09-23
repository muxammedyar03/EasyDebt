import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { requireClientId } from "@/lib/tenant";
import { getApiErrorMessage } from "@/lib/errors";
import { companyDay, parseCompanyDay } from "@/lib/company-report-date";
import { companyDailySnapshotService } from "@/lib/services/company-daily-snapshot.service";

const SORT_KEYS = new Set(["date", "amount", "name"]);

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clientId = requireClientId(session);

    const sp = request.nextUrl.searchParams;
    const paymentsPage = Number(sp.get("paymentsPage") || 1);
    const debtsPage = Number(sp.get("debtsPage") || 1);
    const limit = Number(sp.get("limit") || 20);
    const search = sp.get("search") || "";
    const sortRaw = sp.get("sort") || "date";
    const sort = SORT_KEYS.has(sortRaw) ? (sortRaw as "date" | "amount" | "name") : "date";
    const sortAsc = sp.get("sortAsc") === "true";

    const dateFromStr = sp.get("dateFrom") || companyDay().toISOString().slice(0, 10);
    const dateToStr = sp.get("dateTo") || dateFromStr;
    const dateFrom = parseCompanyDay(dateFromStr);
    const dateTo = parseCompanyDay(dateToStr);

    if (!dateFrom || !dateTo) {
      return NextResponse.json({ error: "Noto'g'ri sana formati" }, { status: 400 });
    }
    if (dateFrom > dateTo) {
      return NextResponse.json({ error: "Boshlanish sanasi tugash sanasidan katta" }, { status: 400 });
    }

    const report = await companyDailySnapshotService.getPeriodReportQuery(clientId, dateFrom, dateTo, {
      paymentsPage,
      debtsPage,
      limit,
      search,
      sort,
      sortAsc,
    });

    return NextResponse.json({
      ...report,
      dateFrom: report.dateFrom.toISOString(),
      dateTo: report.dateTo.toISOString(),
      debts: report.debts.map((d) => ({ ...d, createdAt: d.createdAt.toISOString() })),
      payments: report.payments.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() })),
    });
  } catch (error) {
    console.error("Error fetching company period report:", error);
    return NextResponse.json({ error: getApiErrorMessage(error) }, { status: 500 });
  }
}
