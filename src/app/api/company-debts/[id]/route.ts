import { hasPermission } from "@/lib/security/permission-access";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth";
import { requireClientId } from "@/lib/tenant";
import { getApiErrorMessage } from "@/lib/errors";
import { companyDebtService } from "@/lib/services/company-debt.service";
import { companyService } from "@/lib/services/company.service";

const updateSchema = z.object({
  amount: z.number().positive().optional(),
  note: z.string().min(1).optional(),
  items: z
    .array(
      z.object({
        name: z.string(),
        price: z.number(),
        quantity: z.number().optional(),
      }),
    )
    .nullable()
    .optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (session && !(await hasPermission(session, "company-debts.edit"))) return NextResponse.json({ error: "Ruxsat yo‘q" }, { status: 403 });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clientId = requireClientId(session);

    const { id } = await params;
    const debtId = parseInt(id, 10);
    if (isNaN(debtId)) {
      return NextResponse.json({ error: "Noto'g'ri ID" }, { status: 400 });
    }

    const body = await request.json();
    const validated = updateSchema.parse(body);

    const updated = await companyDebtService.update(
      clientId,
      debtId,
      {
        amount: validated.amount,
        note: validated.note,
        items: validated.items,
      },
      session.userId,
    );

    const company = await companyService.findById(clientId, updated.companyId, false);

    revalidatePath("/dashboard/my-debts");
    if (company) revalidatePath(`/dashboard/my-debts/${company.externalId}`);

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Ma'lumotlar noto'g'ri kiritilgan", details: error.errors }, { status: 400 });
    }
    console.error("Error updating company debt:", error);
    return NextResponse.json({ error: getApiErrorMessage(error) }, { status: 500 });
  }
}

