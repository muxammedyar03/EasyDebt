import { NextRequest, NextResponse } from "next/server";
import { gunzipSync } from "zlib";
import { getSession } from "@/lib/auth";
import { requireClientId } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { PaymentType, Prisma } from "@prisma/client";
import type { DebtItem } from "@/types/domain";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { BackupError } from "@/lib/tenant-backup/archive";
import { readJson } from "@/lib/tenant-backup/json-transfer";
import { previewTenant, restoreTenant } from "@/lib/tenant-backup/service";
import { takeSensitiveAttempt } from "@/lib/security/rate-limit";
import {
  assertImportOwnership,
  debtorImportSchema,
  ImportOwnershipError,
  type DebtorImport,
} from "@/lib/import/debtor-import";

/** Brauzer gzip yuborsa (katta JSON uchun nginx limitidan yengil). */
const MAX_IMPORT_JSON_BYTES = 150 * 1024 * 1024;

async function parseImportJsonBody(request: NextRequest): Promise<unknown> {
  if (!request.body) throw new BackupError("Empty import request");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_IMPORT_JSON_BYTES) {
      await reader.cancel();
      throw new BackupError("Import is too large", 413);
    }
    chunks.push(value);
  }
  const raw = Buffer.concat(chunks);
  const encoding = request.headers.get("content-encoding")?.toLowerCase();
  if (encoding === "gzip" || encoding === "x-gzip") {
    return JSON.parse(gunzipSync(raw, { maxOutputLength: MAX_IMPORT_JSON_BYTES }).toString("utf8"));
  }
  return JSON.parse(raw.toString("utf8"));
}

export async function POST(request: NextRequest) {
  let requestBody: DebtorImport | null = null;
  let fileHash = "";

  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clientId = requireClientId(session);

    // Faqat SUPER_ADMIN va ADMIN import qila oladi
    if (!["ADMIN", "SUPER_ADMIN"].includes(session.role)) {
      return NextResponse.json({ error: "Faqat admin foydalanuvchilar import qila oladi" }, { status: 403 });
    }

    // Request body'ni bir marta o'qib saqlaymiz (ixcham gzip qabul qilinadi)
    const raw = await parseImportJsonBody(request);
    if (
      typeof raw === "object" &&
      raw !== null &&
      "meta" in raw &&
      (raw as { meta?: { version?: number } }).meta?.version === 2
    ) {
      const snapshot = readJson(raw, clientId);
      const preview = await previewTenant(snapshot);
      if (request.headers.get("x-import-action") === "preview")
        return NextResponse.json(preview, { headers: { "Cache-Control": "no-store" } });
      if (request.headers.get("x-import-confirmation") !== snapshot.id)
        throw new BackupError("Preview and confirm this file before importing");
      if (!(await takeSensitiveAttempt(session.userId, "backup"))) throw new BackupError("Too many attempts", 429);
      const actor = await prisma.user.findUnique({ where: { id: session.userId } });
      const password = request.headers.get("x-import-password") ?? "";
      if (
        !actor?.is_active ||
        !["ADMIN", "SUPER_ADMIN"].includes(actor.role) ||
        password.length > 4096 ||
        !(await bcrypt.compare(decodeURIComponent(password), actor.password))
      )
        throw new BackupError("Invalid credentials", 403);
      await restoreTenant(snapshot, session.userId, "merge");
      return NextResponse.json(
        {
          success: true,
          counts: preview.counts,
          debtorsCount: preview.counts.debtors,
          debtsCount: preview.counts.debts,
          paymentsCount: preview.counts.payments,
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    const body = debtorImportSchema.parse(raw);
    requestBody = body;
    const importData = requestBody;

    // 1. Validation
    if (!importData.meta || !importData.debtors) {
      return NextResponse.json({ error: "Noto'g'ri fayl formati" }, { status: 400 });
    }

    if (importData.meta.version !== 1) {
      return NextResponse.json({ error: "Fayl versiyasi mos kelmaydi" }, { status: 400 });
    }

    // 2. File hash yaratish (duplicate import'dan himoya)
    const fileContent = JSON.stringify(importData);
    const legacyHash = crypto.createHash("sha256").update(fileContent).digest("hex");
    fileHash = crypto.createHash("sha256").update(`${clientId}:${fileContent}`).digest("hex");

    // 3. Duplicate check
    const existingImport = await prisma.importHistory.findFirst({
      where: { client_id: clientId, status: "SUCCESS", file_hash: { in: [fileHash, legacyHash] } },
    });

    if (existingImport) {
      return NextResponse.json(
        {
          error: "Bu fayl allaqachon import qilingan",
          importedAt: existingImport.created_at,
        },
        { status: 409 },
      );
    }

    // 4. Transaction bilan import qilish (5 daqiqa timeout)
    const result = await prisma.$transaction(
      async (tx) => {
        await assertImportOwnership(tx, clientId, importData);
        const debtorMap = new Map<string, number>();
        let createdDebtors = 0;
        let createdDebts = 0;
        let createdPayments = 0;

        // 5. Avval barcha mavjud external_id'larni olish (batch)
        const existingDebtorIds = await tx.debtor.findMany({
          where: {
            external_id: { in: importData.debtors.map((d) => d.external_id) },
            client_id: clientId,
          },
          select: { id: true, external_id: true },
        });
        const existingDebtorMap = new Map(existingDebtorIds.map((d) => [d.external_id, d.id]));

        // 6. Debtorlarni yaratish/yangilash
        for (const debtorData of importData.debtors) {
          const existingId = existingDebtorMap.get(debtorData.external_id);

          let debtorId: number;

          if (existingId) {
            // Agar mavjud bo'lsa, yangilaymiz
            await tx.debtor.update({
              where: { id: existingId, client_id: clientId },
              data: {
                first_name: debtorData.first_name,
                last_name: debtorData.last_name,
                phone_number: debtorData.phone_number,
                address: debtorData.address,
              },
            });
            debtorId = existingId;
          } else {
            // Yangi debtor yaratamiz
            const created = await tx.debtor.create({
              data: {
                external_id: debtorData.external_id,
                first_name: debtorData.first_name,
                last_name: debtorData.last_name,
                phone_number: debtorData.phone_number,
                address: debtorData.address,
                created_by: session.userId,
                client_id: clientId,
                total_debt: 0,
              },
            });
            debtorId = created.id;
            createdDebtors++;
          }

          debtorMap.set(debtorData.external_id, debtorId);
        }

        // 7. Barcha mavjud debt external_id'larni olish (batch)
        const allDebtExternalIds = importData.debtors.flatMap((d) => d.debts.map((debt) => debt.external_id));
        const existingDebtIds = await tx.debt.findMany({
          where: { client_id: clientId, external_id: { in: allDebtExternalIds } },
          select: { external_id: true },
        });
        const existingDebtSet = new Set(existingDebtIds.map((d) => d.external_id));

        // 8. Debtlarni batch yaratish
        const debtsToCreate: Prisma.DebtCreateManyInput[] = [];
        for (const debtorData of importData.debtors) {
          const debtorId = debtorMap.get(debtorData.external_id)!;
          for (const debtData of debtorData.debts) {
            if (!existingDebtSet.has(debtData.external_id)) {
              debtsToCreate.push({
                external_id: debtData.external_id,
                debtor_id: debtorId,
                client_id: clientId,
                amount: new Prisma.Decimal(debtData.amount),
                description: debtData.description,
                items: debtData.items == null ? Prisma.DbNull : (debtData.items as DebtItem[]),
                created_at: new Date(debtData.created_at),
                created_by: session.userId,
              });
            }
          }
        }

        if (debtsToCreate.length > 0) {
          await tx.debt.createMany({ data: debtsToCreate, skipDuplicates: false });
          createdDebts = debtsToCreate.length;
        }

        // 9. Barcha mavjud payment external_id'larni olish (batch)
        const allPaymentExternalIds = importData.debtors.flatMap((d) => d.payments.map((p) => p.external_id));
        const existingPaymentIds = await tx.payment.findMany({
          where: { client_id: clientId, external_id: { in: allPaymentExternalIds } },
          select: { external_id: true },
        });
        const existingPaymentSet = new Set(existingPaymentIds.map((p) => p.external_id));

        // 10. Paymentlarni batch yaratish
        const paymentsToCreate: Prisma.PaymentCreateManyInput[] = [];
        for (const debtorData of importData.debtors) {
          const debtorId = debtorMap.get(debtorData.external_id)!;
          for (const paymentData of debtorData.payments) {
            if (!existingPaymentSet.has(paymentData.external_id)) {
              paymentsToCreate.push({
                external_id: paymentData.external_id,
                debtor_id: debtorId,
                client_id: clientId,
                amount: new Prisma.Decimal(paymentData.amount),
                payment_type: paymentData.payment_type as PaymentType,
                note: paymentData.note,
                resets_rating: paymentData.resets_rating,
                created_at: new Date(paymentData.created_at),
                created_by: session.userId,
              });
            }
          }
        }

        if (paymentsToCreate.length > 0) {
          await tx.payment.createMany({ data: paymentsToCreate, skipDuplicates: false });
          createdPayments = paymentsToCreate.length;
        }

        // 11. Total debt'larni qayta hisoblash (batch)
        const debtorIds = Array.from(debtorMap.values());

        const allDebts = await tx.debt.groupBy({
          by: ["debtor_id"],
          where: { client_id: clientId, debtor_id: { in: debtorIds } },
          _sum: { amount: true },
        });

        const allPayments = await tx.payment.groupBy({
          by: ["debtor_id"],
          where: { client_id: clientId, debtor_id: { in: debtorIds } },
          _sum: { amount: true },
        });

        const latestPayments = await tx.payment.groupBy({
          by: ["debtor_id"],
          where: { client_id: clientId, debtor_id: { in: debtorIds } },
          _max: { created_at: true },
        });
        const debtSumMap = new Map(allDebts.map((d) => [d.debtor_id, d._sum.amount ?? new Prisma.Decimal(0)]));
        const paymentSumMap = new Map(allPayments.map((p) => [p.debtor_id, p._sum.amount ?? new Prisma.Decimal(0)]));
        const latestPaymentMap = new Map(latestPayments.map((p) => [p.debtor_id, p._max.created_at]));

        // Batch update uchun Promise.all ishlatamiz
        await Promise.all(
          debtorIds.map((debtorId) => {
            const totalDebts = debtSumMap.get(debtorId) ?? new Prisma.Decimal(0);
            const totalPayments = paymentSumMap.get(debtorId) ?? new Prisma.Decimal(0);
            const totalDebt = totalDebts.minus(totalPayments);

            return tx.debtor.update({
              where: { id: debtorId, client_id: clientId },
              data: {
                total_debt: totalDebt,
                last_payment_date: latestPaymentMap.get(debtorId) ?? null,
              },
            });
          }),
        );

        // 12. Import history yaratish
        await tx.importHistory.create({
          data: {
            user_id: session.userId,
            client_id: clientId,
            file_hash: fileHash,
            debtors_count: createdDebtors,
            debts_count: createdDebts,
            payments_count: createdPayments,
            status: "SUCCESS",
          },
        });

        // 13. Audit log
        await tx.auditLog.create({
          data: {
            user_id: session.userId,
            client_id: clientId,
            action: "IMPORT",
            entity_type: "DEBTOR",
            description: `${createdDebtors} qarzdor, ${createdDebts} qarz va ${createdPayments} to'lov muvaffaqiyatli import qilindi`,
            new_value: {
              debtorsCount: createdDebtors,
              debtsCount: createdDebts,
              paymentsCount: createdPayments,
            },
          },
        });

        return {
          debtorsCount: createdDebtors,
          debtsCount: createdDebts,
          paymentsCount: createdPayments,
        };
      },
      {
        maxWait: 300000, // 5 daqiqa kutish
        timeout: 300000, // 5 daqiqa timeout
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    return NextResponse.json({
      success: true,
      message: "Ma'lumotlar muvaffaqiyatli import qilindi",
      ...result,
    });
  } catch (error) {
    if (error instanceof BackupError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof ImportOwnershipError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid import data" }, { status: 400 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2034"].includes(error.code)) {
      return NextResponse.json({ error: "Import conflict; refresh and retry" }, { status: 409 });
    }
    console.error("Import error:", error);

    // Import history'ga xatolikni yozish (body'ni qayta o'qimaslik)
    try {
      const session = await getSession();
      if (session && requestBody && fileHash) {
        await prisma.importHistory.create({
          data: {
            user_id: session.userId,
            client_id: requireClientId(session),
            file_hash: `${fileHash}:failed:${crypto.randomUUID()}`,
            debtors_count: 0,
            debts_count: 0,
            payments_count: 0,
            status: "FAILED",
            error_message: error instanceof Error ? error.message : "Unknown error",
          },
        });
      }
    } catch (logError) {
      console.error("Failed to log import error:", logError);
    }

    return NextResponse.json(
      {
        error: "Import paytida xatolik yuz berdi",
      },
      { status: 500 },
    );
  }
}
