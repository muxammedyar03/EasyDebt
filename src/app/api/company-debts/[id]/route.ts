import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
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
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const debtId = parseInt(id, 10);
    if (isNaN(debtId)) {
      return NextResponse.json({ error: "Noto'g'ri ID" }, { status: 400 });
    }

    const body = await request.json();
    const validated = updateSchema.parse(body);

    const updated = await companyDebtService.update(debtId, {
      amount: validated.amount,
      note: validated.note,
      items: validated.items,
    });

    const company = await companyService.findById(updated.companyId, false);

    await createAuditLog({
      userId: session.userId,
      action: "UPDATE",
      entityType: "COMPANY_DEBT",
      entityId: debtId,
      newValue: validated,
      description: `Kompaniya qarzi #${debtId} yangilandi`,
      ipAddress: request.headers.get("cf-connecting-ip") || "",
      userAgent: request.headers.get("user-agent") || "",
    });

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
