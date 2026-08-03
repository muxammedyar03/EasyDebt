import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { getApiErrorMessage } from "@/lib/errors";
import { companyDailySnapshotService } from "@/lib/services/company-daily-snapshot.service";

function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sp = request.nextUrl.searchParams;
    const fromParam = sp.get("dateFrom");
    const toParam = sp.get("dateTo");

    const dateFrom = fromParam ? new Date(fromParam) : startOfMonth();
    const dateTo = toParam ? new Date(toParam) : endOfMonth();

    if (Number.isNaN(dateFrom.getTime()) || Number.isNaN(dateTo.getTime())) {
      return NextResponse.json({ error: "Noto'g'ri sana oralig'i" }, { status: 400 });
    }
    if (dateFrom > dateTo) {
      return NextResponse.json({ error: "Boshlanish sanasi tugash sanasidan katta" }, { status: 400 });
    }

    const report = await companyDailySnapshotService.getPeriodReport(dateFrom, dateTo);
    return NextResponse.json(report);
  } catch (error) {
    console.error("Error fetching company period report:", error);
    return NextResponse.json({ error: getApiErrorMessage(error) }, { status: 500 });
  }
}
