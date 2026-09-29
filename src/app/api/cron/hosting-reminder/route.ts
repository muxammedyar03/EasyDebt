import { NextRequest, NextResponse } from "next/server";
import { checkHostingReminder } from "@/lib/hosting-reminder";
import { verifyCronAuth } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

/**
 * GET /api/cron/hosting-reminder
 * Cron job to check hosting payment reminder
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
    const count = await checkHostingReminder();

    return NextResponse.json({
      success: true,
      message:
        count > 0
          ? "Hosting to'lovi haqida eslatma yaratildi"
          : "Eslatma yaratilmadi (6-sana emas yoki allaqachon mavjud)",
      count,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in hosting reminder cron:", error);
    return NextResponse.json({ error: "Serverda xatolik yuz berdi" }, { status: 500 });
  }
}
