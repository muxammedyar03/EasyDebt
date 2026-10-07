import { hasPermission } from "@/lib/security/permission-access";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth";
import { requireClientId } from "@/lib/tenant";
import { getApiErrorMessage } from "@/lib/errors";
import { companyDebtService } from "@/lib/services/company-debt.service";
import { companyService } from "@/lib/services/company.service";
import { createCompanyDebtApiSchema } from "@/lib/validation/company-debt";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (session && !(await hasPermission(session, "company-debts.create")))
      return NextResponse.json({ error: "Ruxsat yo‘q" }, { status: 403 });
    if (!session) {
      return NextResponse.json({ error: "Tizimga kirishda xatolik. Iltimos, qaytadan kiring." }, { status: 401 });
    }

    const clientId = requireClientId(session);

    const body = await request.json();
    const validated = createCompanyDebtApiSchema.parse(body);

    const company = await companyService.findById(clientId, validated.company_id, false);
    if (!company) {
      return NextResponse.json({ error: "Kompaniya topilmadi" }, { status: 404 });
    }

    const debt = await companyDebtService.create(clientId, {
      companyId: validated.company_id,
      amount: validated.amount,
      note: validated.note,
      items: validated.items ?? null,
      createdBy: session.userId,
    });

    revalidatePath("/dashboard/my-debts");
    revalidatePath(`/dashboard/my-debts/${company.externalId}`);

    return NextResponse.json(debt, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Ma'lumotlar noto'g'ri kiritilgan", details: error.errors }, { status: 400 });
    }
    console.error("Error creating company debt:", error);
    return NextResponse.json({ error: getApiErrorMessage(error) }, { status: 500 });
  }
}
