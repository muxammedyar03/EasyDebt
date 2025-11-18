import { NextResponse } from "next/server";

import { checkOverdueDebtors } from "@/lib/overdue-checker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET() {
  try {
    console.log("[cron/check-overdue] invoked");
    const count = await checkOverdueDebtors();
    console.log("[cron/check-overdue] updated count:", count);
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
