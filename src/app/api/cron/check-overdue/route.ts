import { NextResponse } from "next/server";

import { checkOverdueDebtors } from "@/lib/overdue-checker";

export async function GET() {
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
