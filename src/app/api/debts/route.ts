import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth";
import { getEffectiveShopId } from "@/lib/shop-context";
import { createAuditLog } from "@/lib/audit";
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
    if (!session) {
      return NextResponse.json({ error: "Tizimga kirishda xatolik. Iltimos, qaytadan kiring." }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createDebtSchema.parse(body);

    const userId = session.userId;
    const shopId = getEffectiveShopId(session);
    if (!shopId) {
      return NextResponse.json({ error: "Shop context not found" }, { status: 400 });
    }

    // Use transaction to create debt and update debtor's total_debt
    const result = await prisma.$transaction(async (tx) => {
      // Get debtor info
      const debtor = await tx.debtor.findFirst({
        where: { id: validatedData.debtor_id, shop_id: shopId },
      });

      if (!debtor) {
        throw new Error("Qarzdor topilmadi");
      }

      // Create debt record
      const debt = await tx.debt.create({
        data: {
          debtor_id: validatedData.debtor_id,
          amount: validatedData.amount,
          description: validatedData.description || null,
          shop_id: shopId,
          created_by: userId,
          ...(validatedData.created_at && process.env.NODE_ENV === "development"
            ? { created_at: new Date(validatedData.created_at) }
            : {}),
        },
      });

      // Get debt limit from settings (inside transaction)
      const debtLimit = await settingsRepository.getDebtLimit(shopId ?? null, tx);
      if (!debtLimit) {
        throw new Error("Qarz limiti topilmadi, iltimos malum bir shopni tanlang");
      }

      const newTotalDebt = debtor.total_debt.toNumber() + validatedData.amount;

      // Update debtor's total_debt
      const updated = await tx.debtor.updateMany({
        where: { id: validatedData.debtor_id, shop_id: shopId },
        data: {
          total_debt: {
            increment: validatedData.amount,
          },
        },
      });

      if (updated.count !== 1) {
        throw new Error("Qarzdor shopga tegishli emas");
      }

      return { debt, debtor, newTotalDebt, debtLimit };
    });

    // Get user info for description
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { first_name: true, last_name: true, username: true },
    });

    const userFullName =
      user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : user?.username || "Foydalanuvchi";

    const debtorFullName = `${result.debtor.first_name} ${result.debtor.last_name}`;
    const formattedAmount = validatedData.amount.toLocaleString("uz-UZ");
    const description = `${userFullName} qarzdor ${debtorFullName} ga ${formattedAmount} so'm miqdorda qarz qo'shdi`;

    // Create audit log
    await createAuditLog({
      userId,
      shopId,
      action: "DEBT_ADDED",
      entityType: "DEBT",
      entityId: result.debt.id,
      newValue: {
        debtor_id: validatedData.debtor_id,
        amount: validatedData.amount,
        description: validatedData.description,
      },
      description,
    });

    // Check if debt limit exceeded
    if (result.newTotalDebt > result.debtLimit) {
      await createNotification({
        userId,
        shopId,
        debtorId: validatedData.debtor_id,
        type: "DEBT_LIMIT_EXCEEDED",
        title: "Qarz limiti oshdi",
        message: `${result.debtor.first_name} ${result.debtor.last_name} qarz limiti oshdi: ${result.newTotalDebt.toLocaleString()} so'm`,
      });
    }

    // Revalidate pages that display debtor data
    revalidatePath("/dashboard/debtors");
    revalidatePath("/dashboard/default");
    revalidatePath(`/dashboard/default/debitor/${result.debtor.external_id}`);

    return NextResponse.json(result.debt, { status: 201 });
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
