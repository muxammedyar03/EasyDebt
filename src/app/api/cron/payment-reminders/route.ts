import { NextRequest, NextResponse } from "next/server";
import { checkPaymentReminders } from "@/lib/crons";
import { verifyCronAuth } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

/**
 * GET /api/cron/payment-reminders
 * Cron job to check and process due payment reminders
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
    console.log("[cron/payment-reminders] invoked");
    const count = await checkPaymentReminders();
    console.log("[cron/payment-reminders] processed count:", count);

    return NextResponse.json({
      success: true,
      message: `${count} ta to'lov eslatmasi qayta ishlandi`,
      count,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error checking payment reminders:", error);
    return NextResponse.json({ error: "Serverda xatolik yuz berdi" }, { status: 500 });
  }
}
