import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth";
import { requireClientId } from "@/lib/tenant";
import { getApiErrorMessage } from "@/lib/errors";
import { PaymentConflictError, companyPaymentService } from "@/lib/services/company-payment.service";
import { companyService } from "@/lib/services/company.service";
import { createCompanyPaymentApiSchema } from "@/lib/validation/company-payment";
import { saveCompanyReceipt, deleteCompanyReceiptFile } from "@/lib/companies/receipt-storage";
import { PaymentTypeDomain } from "@/types/domain/payment.domain";

export async function POST(request: NextRequest) {
  let uploadedPath: string | undefined;
  let paymentCommitted = false;
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Tizimga kirishda xatolik. Iltimos, qaytadan kiring." }, { status: 401 });
    }

    const clientId = requireClientId(session);
    const idempotencyKey = z
      .string()
      .uuid()
      .optional()
      .parse(request.headers.get("idempotency-key") ?? undefined);

    const contentType = request.headers.get("content-type") || "";
    let companyId: number;
    let amount: number;
    let paymentType: "CASH" | "CLICK" | "CARD";
    let note: string | null | undefined;
    let receiptMeta: {
      receiptPath?: string;
      receiptName?: string;
      receiptMime?: string;
      receiptSize?: number;
    } = {};

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
        uploadedPath = saved.receiptPath;
        receiptMeta = {
          receiptPath: saved.receiptPath,
          receiptName: saved.receiptName,
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

    const company = await companyService.findById(clientId, companyId, false);
    if (!company) {
      await deleteCompanyReceiptFile(uploadedPath);
      return NextResponse.json({ error: "Kompaniya topilmadi" }, { status: 404 });
    }

    const payment = await companyPaymentService.create(clientId, {
      companyId,
      idempotencyKey,
      amount,
      paymentType: PaymentTypeDomain[paymentType],
      note,
      createdBy: session.userId,
      ...receiptMeta,
    });

    paymentCommitted = true;
    if (uploadedPath && payment.receiptPath !== uploadedPath) await deleteCompanyReceiptFile(uploadedPath);
    revalidatePath("/dashboard/my-debts");
    revalidatePath(`/dashboard/my-debts/${company.externalId}`);

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    if (!paymentCommitted) await deleteCompanyReceiptFile(uploadedPath);
    if (error instanceof PaymentConflictError) return NextResponse.json({ error: error.message }, { status: 409 });
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Ma'lumotlar noto'g'ri kiritilgan", details: error.errors }, { status: 400 });
    }
    console.error("Error creating company payment:", error);
    return NextResponse.json({ error: getApiErrorMessage(error) }, { status: 500 });
  }
}
