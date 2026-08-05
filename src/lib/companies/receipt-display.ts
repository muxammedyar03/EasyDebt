/** Client-safe receipt display helpers (no Node fs). */

function receiptExt(mime?: string | null, receiptPath?: string | null): string {
  if (mime === "application/pdf") return "pdf";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime?.startsWith("image/")) return "jpg";
  if (receiptPath) {
    const base = receiptPath.replace(/\\/g, "/").split("/").pop() || "";
    const dot = base.lastIndexOf(".");
    if (dot >= 0) return base.slice(dot + 1).toLowerCase() || "bin";
  }
  return "bin";
}

export function sanitizeFileSlug(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\w.\-()\u0400-\u04FF]+/g, "")
    .replace(/_+/g, "_")
    .slice(0, 80);
}

/** Format: {company}-tolov-cheki-{paymentId}-{YYYY-MM-DD}.{ext} */
export function buildCompanyReceiptFileName(args: {
  companyName: string;
  paymentId: number;
  date: Date | string;
  mime?: string | null;
  receiptPath?: string | null;
}): string {
  const company = sanitizeFileSlug(args.companyName) || "kompaniya";
  const d = new Date(args.date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const ext = receiptExt(args.mime, args.receiptPath);
  return `${company}-tolov-cheki-${args.paymentId}-${yyyy}-${mm}-${dd}.${ext}`;
}

export function sanitizeReceiptOriginalName(originalName: string, mime: string): string {
  const cleaned = (originalName || "").replace(/\\/g, "/").split("/").pop() || "";
  const base = cleaned.replace(/[^\w.\-()\s\u0400-\u04FF]+/g, "_").trim();
  const fallbackExt = receiptExt(mime);
  const name = base.length > 0 ? base : `chek.${fallbackExt}`;
  return name.slice(0, 180);
}

export function getReceiptDisplayName(input: {
  receiptName?: string | null;
  receiptPath?: string | null;
  receiptMime?: string | null;
  companyName?: string | null;
  paymentId?: number | null;
  createdAt?: Date | string | null;
}): string {
  if (input.companyName && input.paymentId != null && input.createdAt) {
    return buildCompanyReceiptFileName({
      companyName: input.companyName,
      paymentId: input.paymentId,
      date: input.createdAt,
      mime: input.receiptMime,
      receiptPath: input.receiptPath,
    });
  }
  if (input.receiptName?.trim()) return input.receiptName.trim();
  if (input.receiptPath) {
    const normalized = input.receiptPath.replace(/\\/g, "/");
    const base = normalized.split("/").pop();
    if (base) return base;
  }
  if (input.receiptMime === "application/pdf") return "chek.pdf";
  if (input.receiptMime?.startsWith("image/")) return "chek.jpg";
  return "chek";
}

export function companyPaymentReceiptUrl(paymentId: number, download = false) {
  const base = `/api/company-payments/${paymentId}/receipt`;
  return download ? `${base}?download=1` : base;
}
