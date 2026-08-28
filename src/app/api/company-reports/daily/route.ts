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
    const date = dateParam ? new Date(dateParam) : companyDailySnapshotService.getFirstDayOfPreviousMonth();

    if (Number.isNaN(date.getTime())) {
      return NextResponse.json({ error: "Noto'g'ri sana" }, { status: 400 });
    }

    const activity = await companyDailySnapshotService.getDayActivity(clientId, date);
    return NextResponse.json(activity);
  } catch (error) {
    console.error("Error fetching company daily report:", error);
    return NextResponse.json({ error: getApiErrorMessage(error) }, { status: 500 });
  }
}
