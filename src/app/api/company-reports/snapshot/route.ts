import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { requireClientId } from "@/lib/tenant";
import { getApiErrorMessage } from "@/lib/errors";
import { companyDailySnapshotService } from "@/lib/services/company-daily-snapshot.service";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clientId = requireClientId(session);

    const dateParam = request.nextUrl.searchParams.get("date");
    if (dateParam) {
      const date = new Date(dateParam);
      if (Number.isNaN(date.getTime())) {
        return NextResponse.json({ error: "Noto'g'ri sana" }, { status: 400 });
      }

      const snapshot = await companyDailySnapshotService.getSnapshotOn(clientId, date);
      return NextResponse.json({ snapshot });
    }

    const snapshot = await companyDailySnapshotService.getOutstandingOneMonthAgo(clientId);
    return NextResponse.json({ snapshot });
  } catch (error) {
    console.error("Error fetching company snapshot:", error);
    return NextResponse.json({ error: getApiErrorMessage(error) }, { status: 500 });
  }
}
