import { hasPermission } from "@/lib/security/permission-access";
import { refreshDebtorStatus } from "@/lib/security/refresh-debtor-status";
import { serializableTransaction } from "@/lib/security/serializable";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth";
import { requireClientId } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import {
  debtorPaymentRequestId,
  PaymentRequestConflictError,
  samePaymentRequest,
} from "@/lib/security/payment-request";

const createPaymentSchema = z.object({
  debtor_id: z.number(),
  amount: z.number().positive("To'lov miqdori musbat bo'lishi kerak"),
  payment_type: z.enum(["CASH", "CLICK", "CARD"]),
  note: z.string().nullable().optional(),
  resets_rating: z.boolean().optional(),
  created_at: z.string().optional(), // Dev mode: custom date
});

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (session && !(await hasPermission(session, "payments.create"))) return NextResponse.json({ error: "Ruxsat yo‘q" }, { status: 403 });
    if (!session) {
      return NextResponse.json({ error: "Tizimga kirishda xatolik. Iltimos, qaytadan kiring." }, { status: 401 });
    }

    const clientId = requireClientId(session);

    const body = await request.json();
    const validatedData = createPaymentSchema.parse(body);
    const userId = session.userId;
    const idempotencyKey = z
      .string()
      .uuid()
      .optional()
      .parse(request.headers.get("idempotency-key") ?? undefined);
    const externalId = idempotencyKey ? debtorPaymentRequestId(clientId, userId, idempotencyKey) : undefined;
    const note = validatedData.note || null;
    const resetsRating = validatedData.resets_rating ?? false;
    const createdAt =
      validatedData.created_at && process.env.NODE_ENV === "development"
        ? z.coerce.date().parse(validatedData.created_at)
        : undefined;

    const user = await prisma.user.findFirst({
      where: { id: userId, client_id: clientId },
      select: { first_name: true, last_name: true, username: true },
    });
    if (!user) return NextResponse.json({ error: "Foydalanuvchi topilmadi" }, { status: 401 });
    const userFullName =
      user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.username || "Foydalanuvchi";

    const execute = () =>
      serializableTransaction(async (tx) => {
        if (externalId) {
          const existing = await tx.payment.findFirst({
            where: { external_id: externalId, client_id: clientId },
            include: { debtor: true },
          });
          if (existing) {
            const cancelled = await tx.payment.findFirst({
              where: { client_id: clientId, reverses_payment_id: existing.id }, select: { id: true },
            });
            if (cancelled) throw new PaymentRequestConflictError("Bu to‘lov bekor qilingan; request kalitini qayta ishlatib bo‘lmaydi");
            if (
              !samePaymentRequest(existing, {
                debtorId: validatedData.debtor_id,
                amount: validatedData.amount,
                paymentType: validatedData.payment_type,
                note,
                resetsRating,
                createdAt,
              })
            )
              throw new PaymentRequestConflictError("Bu request kaliti boshqa to'lov uchun ishlatilgan");
            const audit = await tx.auditLog.findFirst({
              where: { client_id: clientId, entity_type: "PAYMENT", entity_id: existing.id, action: "UPDATE" },
            });
            const receipt = audit?.new_value as { previousBalance?: number; newBalance?: number } | null;
            if (receipt?.previousBalance === undefined || receipt.newBalance === undefined)
              throw new Error("To'lov cheki topilmadi");
            return { payment: existing, debtor: existing.debtor, receipt };
          }
        }
        // Get current debtor to check debt amount
        const debtor = await tx.debtor.findFirst({
          where: { id: validatedData.debtor_id, client_id: clientId },
        });

        if (!debtor) {
          throw new Error("Qarzdor topilmadi");
        }

        // Create payment record
        const payment = await tx.payment.create({
          data: {
            debtor_id: validatedData.debtor_id,
            ...(externalId ? { external_id: externalId } : {}),
            client_id: clientId,
            amount: validatedData.amount,
            payment_type: validatedData.payment_type,
            note,
            resets_rating: resetsRating,
            created_by: userId,
            ...(createdAt ? { created_at: createdAt } : {}),
          },
        });

        // Update debtor's total_debt (decrease) and payment date
        await tx.debtor.update({
          where: { id: validatedData.debtor_id },
          data: {
            total_debt: {
              decrement: validatedData.amount,
            },
            last_payment_date: new Date(),
          },
        });

        const updatedDebtor = await refreshDebtorStatus(tx, clientId, debtor.id);
        const receipt = {
          previousBalance: debtor.total_debt.toNumber(),
          newBalance: updatedDebtor.total_debt.toNumber(),
        };
        const debtorFullName = `${debtor.first_name} ${debtor.last_name}`;
        const formattedAmount = validatedData.amount.toLocaleString("uz-UZ");
        await tx.auditLog.create({
          data: {
            client_id: clientId,
            user_id: userId,
            action: "UPDATE",
            entity_type: "PAYMENT",
            entity_id: payment.id,
            new_value: {
              debtor_id: validatedData.debtor_id,
              amount: validatedData.amount,
              payment_type: validatedData.payment_type,
              ...receipt,
            },
            description: `${userFullName} qarzdor ${debtorFullName} dan ${formattedAmount} so'm miqdorda ${validatedData.payment_type === "CASH" ? "naqd usulda" : validatedData.payment_type === "CLICK" ? "click orqali" : "karta orqali"} to'lov qabul qildi`,
          },
        });
        return { payment, debtor, receipt };
      });
    let result;
    try {
      result = await execute();
    } catch (error) {
      if (!externalId || !(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002")
        throw error;
      result = await execute();
    }

    // Revalidate pages that display debtor data
    revalidatePath("/dashboard/debtors");
    revalidatePath("/dashboard/default");
    revalidatePath(`/dashboard/default/debitor/${result.debtor.external_id}`);

    return NextResponse.json(
      {
        ...JSON.parse(
          JSON.stringify(result.payment, (_key, value) =>
            typeof value === "bigint" || (value && typeof value === "object" && "toNumber" in value)
              ? Number(value)
              : value,
          ),
        ),
        ...result.receipt,
        debtorName: `${result.debtor.first_name} ${result.debtor.last_name}`,
        debtorPhone: result.debtor.phone_number,
        employeeName: userFullName,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof PaymentRequestConflictError)
      return NextResponse.json({ error: error.message }, { status: 409 });
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Ma'lumotlar noto'g'ri kiritilgan", details: error.errors }, { status: 400 });
    }

    if (error instanceof Error && error.message === "Qarzdor topilmadi")
      return NextResponse.json({ error: error.message }, { status: 404 });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003")
      return NextResponse.json({ error: "Qarzdor topilmadi" }, { status: 404 });

    console.error("Error creating payment:", error);

    return NextResponse.json({ error: "Serverda xatolik yuz berdi" }, { status: 500 });
  }
}
