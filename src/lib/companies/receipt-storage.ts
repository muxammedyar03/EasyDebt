import { randomUUID } from "crypto";
import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import {
  COMPANY_RECEIPT_ALLOWED_MIME,
  COMPANY_RECEIPT_MAX_BYTES,
  isAllowedCompanyReceiptMime,
} from "@/lib/validation/company-receipt";
import { sanitizeReceiptOriginalName } from "@/lib/companies/receipt-display";

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "company-receipts");

export type SavedCompanyReceipt = {
  receiptPath: string;
  receiptName: string;
  receiptMime: string;
  receiptSize: number;
};

export function getCompanyReceiptAbsolutePath(relativePath: string): string {
  const normalized = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, "");
  const absolute = path.join(/*turbopackIgnore: true*/ process.cwd(), normalized);
  if (!absolute.startsWith(UPLOAD_DIR + path.sep)) {
    throw new Error("Noto'g'ri fayl yo'li");
  }
  return absolute;
}

export async function saveCompanyReceipt(file: File): Promise<SavedCompanyReceipt> {
  if (!isAllowedCompanyReceiptMime(file.type)) {
    throw new Error(`Fayl turi ruxsat etilmagan. Ruxsat: ${COMPANY_RECEIPT_ALLOWED_MIME.join(", ")}`);
  }
  if (file.size <= 0 || file.size > COMPANY_RECEIPT_MAX_BYTES) {
    throw new Error("Fayl hajmi 2MB dan oshmasligi kerak");
  }

  await mkdir(UPLOAD_DIR, { recursive: true });

  const ext =
    file.type === "application/pdf"
      ? "pdf"
      : file.type === "image/png"
        ? "png"
        : file.type === "image/webp"
          ? "webp"
          : "jpg";

  const filename = `${Date.now()}-${randomUUID()}.${ext}`;
  const absolute = path.join(UPLOAD_DIR, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(absolute, buffer);

  return {
    receiptPath: path.join("uploads", "company-receipts", filename),
    receiptName: sanitizeReceiptOriginalName(file.name, file.type),
    receiptMime: file.type,
    receiptSize: file.size,
  };
}

export async function deleteCompanyReceiptFile(relativePath: string | null | undefined): Promise<void> {
  if (!relativePath) return;
  try {
    const absolute = getCompanyReceiptAbsolutePath(relativePath);
    await unlink(absolute);
  } catch {
    // ignore missing files
  }
}
