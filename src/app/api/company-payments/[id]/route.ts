import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth";
import { requireClientId } from "@/lib/tenant";
import { getApiErrorMessage } from "@/lib/errors";
import { companyPaymentService } from "@/lib/services/company-payment.service";
import { companyService } from "@/lib/services/company.service";
import { PaymentTypeDomain } from "@/types/domain/payment.domain";

const updateSchema = z.object({
  amount: z.number().positive().optional(),
  payment_type: z.enum(["CASH", "CLICK", "CARD"]).optional(),
  note: z.string().min(1).optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clientId = requireClientId(session);

    const { id } = await params;
    const paymentId = parseInt(id, 10);
    if (isNaN(paymentId)) {
      return NextResponse.json({ error: "Noto'g'ri ID" }, { status: 400 });
    }

    const body = await request.json();
    const validated = updateSchema.parse(body);

    const updated = await companyPaymentService.update(
      clientId,
      paymentId,
      {
        amount: validated.amount,
        paymentType: validated.payment_type ? PaymentTypeDomain[validated.payment_type] : undefined,
        note: validated.note,
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
    console.error("Error updating company payment:", error);
    return NextResponse.json({ error: getApiErrorMessage(error) }, { status: 500 });
  }
}
