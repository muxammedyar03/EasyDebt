import { hasPermission } from "@/lib/security/permission-access";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { requireClientId } from "@/lib/tenant";
import { paymentReminderService } from "@/lib/services/payment-reminder.service";

const createReminderSchema = z.object({
  debtor_id: z.number().int().positive("Qarzdor ID noto'g'ri"),
  reminder_at: z.string().transform((val) => new Date(val)),
  note: z.string().optional().nullable(),
});

const querySchema = z.object({
  debtor_id: z.string().optional(),
  status: z.enum(["PENDING", "NOTIFIED", "COMPLETED", "CANCELLED"]).optional(),
  page: z.string().optional().default("1"),
  limit: z.string().optional().default("10"),
});

/**
 * GET /api/payment-reminders
 * List payment reminders with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (session && !(await hasPermission(session, "reminders.view"))) return NextResponse.json({ error: "Ruxsat yo‘q" }, { status: 403 });
    if (!session) {
      return NextResponse.json({ error: "Avtorizatsiya talab qilinadi" }, { status: 401 });
    }

    const clientId = requireClientId(session);

    const { searchParams } = new URL(request.url);
    const params = querySchema.parse({
      debtor_id: searchParams.get("debtor_id") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      page: searchParams.get("page") ?? "1",
      limit: searchParams.get("limit") ?? "10",
    });

    const filters = {
      debtorId: params.debtor_id ? parseInt(params.debtor_id, 10) : undefined,
      status: params.status,
    };

    const pagination = {
      page: parseInt(params.page, 10),
      limit: parseInt(params.limit, 10),
    };

    const result = await paymentReminderService.findMany(clientId, filters, pagination);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching payment reminders:", error);
    return NextResponse.json({ error: "Serverda xatolik yuz berdi" }, { status: 500 });
  }
}

/**
 * POST /api/payment-reminders
 * Create a new payment reminder
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (session && !(await hasPermission(session, "reminders.manage"))) return NextResponse.json({ error: "Ruxsat yo‘q" }, { status: 403 });
    if (!session) {
      return NextResponse.json({ error: "Avtorizatsiya talab qilinadi" }, { status: 401 });
    }

    const clientId = requireClientId(session);

    const body = await request.json();
    const validatedData = createReminderSchema.parse(body);

    const reminder = await paymentReminderService.create(clientId, {
      debtorId: validatedData.debtor_id,
      createdBy: session.userId,
      reminderAt: validatedData.reminder_at,
      note: validatedData.note ?? null,
    });

    return NextResponse.json(reminder, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Ma'lumotlar noto'g'ri kiritilgan", details: error.errors }, { status: 400 });
    }

    console.error("Error creating payment reminder:", error);
    return NextResponse.json({ error: "Serverda xatolik yuz berdi" }, { status: 500 });
  }
}

