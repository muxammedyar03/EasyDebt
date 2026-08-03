import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { getApiErrorMessage } from "@/lib/errors";
import { companyPaymentService } from "@/lib/services/company-payment.service";
import { companyService } from "@/lib/services/company.service";
import { createCompanyPaymentApiSchema } from "@/lib/validation/company-payment";
import { saveCompanyReceipt } from "@/lib/companies/receipt-storage";
import { PaymentTypeDomain } from "@/types/domain/payment.domain";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Tizimga kirishda xatolik. Iltimos, qaytadan kiring." }, { status: 401 });
    }

    const contentType = request.headers.get("content-type") || "";
    let companyId: number;
    let amount: number;
    let paymentType: "CASH" | "CLICK" | "CARD";
    let note: string | null | undefined;
    let receiptMeta: { receiptPath?: string; receiptMime?: string; receiptSize?: number } = {};

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const validated = createCompanyPaymentApiSchema.parse({
        company_id: form.get("company_id"),
        amount: form.get("amount"),
        payment_type: form.get("payment_type"),
        note: form.get("note"),
      });
      companyId = validated.company_id;
      amount = validated.amount;
      paymentType = validated.payment_type;
      note = validated.note;

      const file = form.get("receipt");
      if (file instanceof File && file.size > 0) {
        const saved = await saveCompanyReceipt(file);
        receiptMeta = {
          receiptPath: saved.receiptPath,
          receiptMime: saved.receiptMime,
          receiptSize: saved.receiptSize,
        };
      }
    } else {
      const body = await request.json();
      const validated = createCompanyPaymentApiSchema.parse(body);
      companyId = validated.company_id;
      amount = validated.amount;
      paymentType = validated.payment_type;
      note = validated.note;
    }

    const company = await companyService.findById(companyId, false);
    if (!company) {
      return NextResponse.json({ error: "Kompaniya topilmadi" }, { status: 404 });
    }

    const payment = await companyPaymentService.create({
      companyId,
      amount,
      paymentType: PaymentTypeDomain[paymentType],
      note,
      createdBy: session.userId,
      ...receiptMeta,
    });

    await createAuditLog({
      userId: session.userId,
      action: "CREATE",
      entityType: "COMPANY_PAYMENT",
      entityId: payment.id,
      newValue: {
        company_id: companyId,
        amount,
        payment_type: paymentType,
        note,
        has_receipt: Boolean(receiptMeta.receiptPath),
      },
      description: `${company.name} ga ${amount.toLocaleString("uz-UZ")} so'm to'lov qilindi`,
      ipAddress: request.headers.get("cf-connecting-ip") || "",
      userAgent: request.headers.get("user-agent") || "",
    });

    revalidatePath("/dashboard/my-debts");
    revalidatePath(`/dashboard/my-debts/${company.externalId}`);

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Ma'lumotlar noto'g'ri kiritilgan", details: error.errors }, { status: 400 });
    }
    console.error("Error creating company payment:", error);
    return NextResponse.json({ error: getApiErrorMessage(error) }, { status: 500 });
  }
}
