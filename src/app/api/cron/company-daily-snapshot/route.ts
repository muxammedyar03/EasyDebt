import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/cron-auth";
import { companyDailySnapshotService } from "@/lib/services/company-daily-snapshot.service";
import { companyService } from "@/lib/services/company.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

/**
 * GET /api/cron/company-daily-snapshot
 * Refresh today's company daily snapshot + sync overdue flags.
 */
export async function GET(request: NextRequest) {
  const auth = verifyCronAuth(request);
  if (!auth.authorized) {
    return auth.error;
  }

  try {
    const [snapshot, overdueUpdated] = await Promise.all([
      companyDailySnapshotService.refreshForDate(new Date()),
      companyService.syncOverdueFlags(),
    ]);

    return NextResponse.json({
      success: true,
      snapshot,
      overdueUpdated,
    });
  } catch (error) {
    console.error("Error refreshing company daily snapshot:", error);
    return NextResponse.json({ error: "Serverda xatolik yuz berdi" }, { status: 500 });
  }
}
