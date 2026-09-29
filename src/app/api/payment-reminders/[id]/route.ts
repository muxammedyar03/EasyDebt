import { hasPermission } from "@/lib/security/permission-access";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { requireClientId } from "@/lib/tenant";
import { paymentReminderService } from "@/lib/services/payment-reminder.service";

const updateReminderSchema = z.object({
  reminder_at: z
    .string()
    .transform((val) => new Date(val))
    .optional(),
  note: z.string().optional().nullable(),
  status: z.enum(["PENDING", "NOTIFIED", "COMPLETED", "CANCELLED"]).optional(),
});

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/payment-reminders/[id]
 * Get a specific payment reminder
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (session && !(await hasPermission(session, "reminders.view"))) return NextResponse.json({ error: "Ruxsat yo‘q" }, { status: 403 });
    if (!session) {
      return NextResponse.json({ error: "Avtorizatsiya talab qilinadi" }, { status: 401 });
    }

    const clientId = requireClientId(session);

    const { id } = await params;
    const reminderId = parseInt(id, 10);

    if (isNaN(reminderId)) {
      return NextResponse.json({ error: "Noto'g'ri ID" }, { status: 400 });
    }

    const reminder = await paymentReminderService.findById(clientId, reminderId);

    if (!reminder) {
      return NextResponse.json({ error: "Eslatma topilmadi" }, { status: 404 });
    }

    return NextResponse.json(reminder);
  } catch (error) {
    console.error("Error fetching payment reminder:", error);
    return NextResponse.json({ error: "Serverda xatolik yuz berdi" }, { status: 500 });
  }
}

/**
 * PATCH /api/payment-reminders/[id]
 * Update a payment reminder
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (session && !(await hasPermission(session, "reminders.manage"))) return NextResponse.json({ error: "Ruxsat yo‘q" }, { status: 403 });
    if (!session) {
      return NextResponse.json({ error: "Avtorizatsiya talab qilinadi" }, { status: 401 });
    }

    const clientId = requireClientId(session);

    const { id } = await params;
    const reminderId = parseInt(id, 10);

    if (isNaN(reminderId)) {
      return NextResponse.json({ error: "Noto'g'ri ID" }, { status: 400 });
    }

    const existingReminder = await paymentReminderService.findById(clientId, reminderId);
    if (!existingReminder) {
      return NextResponse.json({ error: "Eslatma topilmadi" }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = updateReminderSchema.parse(body);

    const reminder = await paymentReminderService.update(
      clientId,
      reminderId,
      {
        reminderAt: validatedData.reminder_at,
        note: validatedData.note ?? undefined,
        status: validatedData.status,
      },
      session.userId,
    );

    return NextResponse.json(reminder);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Ma'lumotlar noto'g'ri kiritilgan", details: error.errors }, { status: 400 });
    }

    console.error("Error updating payment reminder:", error);
    return NextResponse.json({ error: "Serverda xatolik yuz berdi" }, { status: 500 });
  }
}

/**
 * DELETE /api/payment-reminders/[id]
 * Delete a payment reminder
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (session && !(await hasPermission(session, "reminders.manage"))) return NextResponse.json({ error: "Ruxsat yo‘q" }, { status: 403 });
    if (!session) {
      return NextResponse.json({ error: "Avtorizatsiya talab qilinadi" }, { status: 401 });
    }

    const clientId = requireClientId(session);

    const { id } = await params;
    const reminderId = parseInt(id, 10);

    if (isNaN(reminderId)) {
      return NextResponse.json({ error: "Noto'g'ri ID" }, { status: 400 });
    }

    const existingReminder = await paymentReminderService.findById(clientId, reminderId);
    if (!existingReminder) {
      return NextResponse.json({ error: "Eslatma topilmadi" }, { status: 404 });
    }

    await paymentReminderService.delete(clientId, reminderId, session.userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting payment reminder:", error);
    return NextResponse.json({ error: "Serverda xatolik yuz berdi" }, { status: 500 });
  }
}

