import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { getApiErrorMessage } from "@/lib/errors";
import type { ChartPeriod } from "@/lib/period-date-range";
import type { CompanyChartMetric } from "@/types/domain/company-daily-snapshot.domain";
import { companyDailySnapshotService } from "@/lib/services/company-daily-snapshot.service";

const PERIODS = new Set<ChartPeriod>(["week", "3months", "year"]);
const METRICS = new Set<CompanyChartMetric>(["debt", "payments"]);

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sp = request.nextUrl.searchParams;
    const periodRaw = sp.get("period") || "week";
    const typeRaw = sp.get("type") || "debt";
    const period = PERIODS.has(periodRaw as ChartPeriod) ? (periodRaw as ChartPeriod) : "week";
    const type = METRICS.has(typeRaw as CompanyChartMetric) ? (typeRaw as CompanyChartMetric) : "debt";

    const points = await companyDailySnapshotService.getOverviewChartSeries(period, type);
    return NextResponse.json({ period, type, points });
  } catch (error) {
    console.error("Error fetching company chart:", error);
    return NextResponse.json({ error: getApiErrorMessage(error) }, { status: 500 });
  }
}
