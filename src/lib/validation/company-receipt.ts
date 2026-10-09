export const COMPANY_RECEIPT_MAX_BYTES = 2 * 1024 * 1024;

export const COMPANY_RECEIPT_ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;

export type CompanyReceiptMime = (typeof COMPANY_RECEIPT_ALLOWED_MIME)[number];

export type CompanyReceiptValidationMessages = {
  invalidType: string;
  tooLarge: string;
};

const DEFAULT_MESSAGES: CompanyReceiptValidationMessages = {
  invalidType: "Faqat JPEG, PNG, WEBP yoki PDF yuklash mumkin",
  tooLarge: "Fayl hajmi 2MB dan oshmasligi kerak",
};

export function isAllowedCompanyReceiptMime(mime: string): mime is CompanyReceiptMime {
  return (COMPANY_RECEIPT_ALLOWED_MIME as readonly string[]).includes(mime);
}

export function validateCompanyReceiptFile(
  file: File,
  messages: CompanyReceiptValidationMessages = DEFAULT_MESSAGES,
): string | null {
  if (!isAllowedCompanyReceiptMime(file.type)) return messages.invalidType;
  if (file.size <= 0 || file.size > COMPANY_RECEIPT_MAX_BYTES) return messages.tooLarge;
  return null;
}
