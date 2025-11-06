import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

export async function checkHostingReminder(): Promise<number> {
  try {
    const now = new Date();

    if (now.getUTCDate() !== 6) {
      console.log(`Hosting reminder skipped: Current date is ${now.getUTCDate()}, not 2nd`);
      return 0;
    }

    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 6, 0, 0, 0));
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

    if (existing) {
      console.log(`Hosting reminder already exists for this month: ${existing.id}`);
      return 0;
    }

    await createNotification({
      type: "HOSTING_REMINDER",
      title: "Hosting uchun to'lov yaqinlashmoqda",
      message: `${now.getUTCFullYear()}-yil ${now.getUTCMonth() + 1}-oyning hosting to'lovi haqida eslatma.`,
    });

    console.log(`Hosting reminder created successfully for ${now.toISOString()}`);
    return 1;
  } catch (error) {
    console.error("Failed to create hosting reminder:", error);
    return 0;
  }
}
