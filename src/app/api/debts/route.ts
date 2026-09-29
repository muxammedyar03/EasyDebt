import { hasPermission } from "@/lib/security/permission-access";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth";
import { requireClientId } from "@/lib/tenant";
import { createRequiredAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { getApiErrorMessage } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { settingsRepository } from "@/entities/settings/api";

const createDebtSchema = z.object({
  debtor_id: z.number(),
  amount: z.number().positive("Qarz miqdori musbat bo'lishi kerak"),
  description: z.string().nullable().optional(),
  created_at: z.string().optional(), // Dev mode: custom date
});

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (session && !(await hasPermission(session, "debts.create"))) return NextResponse.json({ error: "Ruxsat yo‘q" }, { status: 403 });
    if (!session) {
      return NextResponse.json({ error: "Tizimga kirishda xatolik. Iltimos, qaytadan kiring." }, { status: 401 });
    }

    const clientId = requireClientId(session);

    const body = await request.json();
    const validatedData = createDebtSchema.parse(body);

    const userId = session.userId;

    // Use transaction to create debt and update debtor's total_debt
    const result = await prisma.$transaction(async (tx) => {
      // Get debtor info
      const debtor = await tx.debtor.findFirst({
        where: { id: validatedData.debtor_id, client_id: clientId },
      });

      if (!debtor) {
        throw new Error("Qarzdor topilmadi");
      }

      // Create debt record
      const debt = await tx.debt.create({
        data: {
          debtor_id: validatedData.debtor_id,
          client_id: clientId,
          amount: validatedData.amount,
          description: validatedData.description || null,
          created_by: userId,
          ...(validatedData.created_at && process.env.NODE_ENV === "development"
            ? { created_at: new Date(validatedData.created_at) }
            : {}),
        },
      });

      // Get debt limit from settings (inside transaction)
      const debtLimit = await settingsRepository.getDebtLimit(clientId, tx);

      // Update debtor's total_debt
      const updatedDebtor = await tx.debtor.update({
        where: { id: validatedData.debtor_id },
        data: {
          total_debt: {
            increment: validatedData.amount,
          },
        },
      });

      await createRequiredAuditLog(tx, {
        clientId,
        userId,
        action: "DEBT_ADDED",
        entityType: "DEBT",
        entityId: debt.id,
        newValue: { debtor_id: debtor.id, amount: debt.amount.toString(), description: debt.description },
        description: `Qarzdor #${debtor.id} ga qarz #${debt.id} qo'shildi`,
      });

      return { debt, debtor, updatedDebtor, debtLimit };
    });

    // Get user info for description
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { first_name: true, last_name: true, username: true },
    });

    const userFullName =
      user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : user?.username || "Foydalanuvchi";

    // Check if debt limit exceeded
    const newTotalDebt = result.updatedDebtor.total_debt.toNumber();
    const limitExceeded = newTotalDebt > result.debtLimit;
    if (limitExceeded) {
      await createNotification({
        clientId,
        userId,
        debtorId: validatedData.debtor_id,
        type: "DEBT_LIMIT_EXCEEDED",
        title: "Qarz limiti oshdi",
        message: `${result.debtor.first_name} ${result.debtor.last_name} qarz limiti oshdi: ${newTotalDebt.toLocaleString()} so'm`,
      });
    }

    // Revalidate pages that display debtor data
    revalidatePath("/dashboard/debtors");
    revalidatePath("/dashboard/default");
    revalidatePath(`/dashboard/default/debitor/${result.debtor.external_id}`);

    return NextResponse.json(
      {
        ...JSON.parse(
          JSON.stringify(result.debt, (_key, value) =>
            typeof value === "bigint" || (value && typeof value === "object" && "toNumber" in value)
              ? Number(value)
              : value,
          ),
        ),
        previousBalance: result.debtor.total_debt.toNumber(),
        newBalance: result.updatedDebtor.total_debt.toNumber(),
        debtorName: `${result.debtor.first_name} ${result.debtor.last_name}`,
        debtorPhone: result.debtor.phone_number,
        employeeName: userFullName,
        limitExceeded,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Ma'lumotlar noto'g'ri kiritilgan", details: error.errors }, { status: 400 });
    }

    console.error("Error creating debt:", error);

    if (error && typeof error === "object" && "code" in error) {
      const prismaError = error as { code: string };
      if (prismaError.code === "P2003") {
        return NextResponse.json({ error: "Qarzdor topilmadi" }, { status: 404 });
      }
    }

    return NextResponse.json({ error: getApiErrorMessage(error) }, { status: 500 });
  }
}

