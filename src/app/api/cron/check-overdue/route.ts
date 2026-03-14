import { NextRequest, NextResponse } from "next/server";
import { checkOverdueDebtors } from "@/lib/overdue-checker";
import { verifyCronAuth } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

/**
 * GET /api/cron/check-overdue
 * Cron job to check overdue debtors
 *
 * Auth: CRON_SECRET (header yoki query param)
 */
export async function GET(request: NextRequest) {
  // Auth tekshirish
  const auth = verifyCronAuth(request);
  if (!auth.authorized) {
    return auth.error;
  }

  try {
    const count = await checkOverdueDebtors();
    return NextResponse.json({
      success: true,
      message: `${count} ta qarzdor muddati o'tgan deb belgilandi`,
      count,
    });
  } catch (error) {
    console.error("Error checking overdue debtors:", error);
    return NextResponse.json({ error: "Serverda xatolik yuz berdi" }, { status: 500 });
  }
}
