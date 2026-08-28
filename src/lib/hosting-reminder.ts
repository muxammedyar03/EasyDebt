import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

export async function checkHostingReminder(): Promise<number> {
  try {
    const now = new Date();

    if (now.getUTCDate() !== 6) {
      console.log(`Hosting reminder skipped: Current date is ${now.getUTCDate()}, not 2nd`);
      return 0;
    }

    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 5, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59));

    const clients = await prisma.client.findMany({ where: { is_active: true }, select: { id: true } });
    let created = 0;

    for (const client of clients) {
      const existing = await prisma.notification.findFirst({
        where: {
          client_id: client.id,
          type: "HOSTING_REMINDER",
          created_at: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
        select: { id: true },
      });

      if (existing) {
        console.log(`Hosting reminder already exists for client ${client.id}: ${existing.id}`);
        continue;
      }

      await createNotification({
        clientId: client.id,
        type: "HOSTING_REMINDER",
        title: "Hosting uchun to'lov yaqinlashmoqda",
        message: `${now.getUTCFullYear()}-yil ${now.getUTCMonth() + 1}-oyning hosting to'lovi haqida eslatma.`,
      });
      created += 1;
    }

    console.log(`Hosting reminders created: ${created}`);
    return created;
  } catch (error) {
    console.error("Failed to create hosting reminder:", error);
    return 0;
  }
}
