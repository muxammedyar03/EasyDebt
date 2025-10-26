import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

// Trigger monthly reminder for hosting payment on the 2nd day of each month.
// You can schedule an external cron to call this endpoint daily.
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const force = searchParams.get("force") === "true";

    const now = new Date();
    const isSecondDay = now.getUTCDate() === 2; // use UTC to be consistent on servers

    if (!force && !isSecondDay) {
      return NextResponse.json({ skipped: true, reason: "Not the 2nd day of the month" });
    }

    // Ensure we only create one reminder per month (global)
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59));

    const existing = await prisma.notification.findFirst({
      where: {
        type: "HOSTING_REMINDER",
        created_at: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      select: { id: true },
    });

    if (existing && !force) {
      return NextResponse.json({ created: false, alreadyExists: true });
    }

    await createNotification({
      type: "HOSTING_REMINDER",
      title: "Hosting uchun to'lov yaqinlashmoqda",
      message: "Har oyning 2-sanasida hosting to'lovi haqida eslatma.",
    });

    return NextResponse.json({ created: true });
  } catch (error) {
    console.error("Error creating hosting reminder:", error);
    return NextResponse.json({ error: "Serverda xatolik yuz berdi" }, { status: 500 });
  }
}
