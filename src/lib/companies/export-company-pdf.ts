"use client";

import type { CompanyDomain } from "@/types/domain/company.domain";

type CompanyTimelineItem = {
  type: "DEBT" | "PAYMENT";
  amount: number;
  createdAt: Date;
  note: string | null;
  subtitle?: string;
  attachmentName?: string | null;
};

export type CompanyPdfLabels = {
  title?: string;
  company?: string;
  contact?: string;
  phone?: string;
  address?: string;
  created?: string;
  summary?: string;
  totalDebt?: string;
  totalPaid?: string;
  remaining?: string;
  timeline?: string;
  debt?: string;
  payment?: string;
  file?: string;
  generated?: string;
  currency?: string;
  empty?: string;
};

const DEFAULT_LABELS: Required<CompanyPdfLabels> = {
  title: "Kompaniya qarz hisoboti (PDF)",
  company: "Kompaniya",
  contact: "Mas'ul",
  phone: "Telefon",
  address: "Manzil",
  created: "Yaratilgan",
  summary: "Umumiy",
  totalDebt: "Umumiy qarz",
  totalPaid: "Umumiy to'lov",
  remaining: "Qolgan qarz",
  timeline: "Vaqt chizig'i",
  debt: "Qarz",
  payment: "To'lov",
  file: "Fayl",
  generated: "Yaratilgan",
  currency: "so'm",
  empty: "—",
};

export async function exportCompanyReceipt(args: {
  appName: string;
  company: CompanyDomain;
  totals: { totalDebtAdded: number; totalPaid: number; remaining: number };
  timeline: CompanyTimelineItem[];
  generatedAt?: Date;
  labels?: CompanyPdfLabels;
  locale?: string;
}) {
  const labels = { ...DEFAULT_LABELS, ...args.labels };
  const numberLocale = args.locale === "ru" ? "ru-RU" : "uz-UZ";

  const jspdfMod = await import("jspdf");
  const { jsPDF } = jspdfMod as unknown as {
    jsPDF: new (opts: { orientation: string; unit: string; format: string }) => {
      internal: { pageSize: { getWidth: () => number; getHeight: () => number } };
      setFontSize: (n: number) => void;
      text: (t: string, x: number, y: number) => void;
      addPage: () => void;
      output: (type: "blob") => Blob;
    };
  };

  const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 12;
  let y = margin;

  const ensureSpace = (need = 10) => {
    if (y + need > pageHeight - margin) {
      pdf.addPage();
      y = margin;
    }
  };

  pdf.setFontSize(16);
  pdf.text(args.appName, margin, y);
  y += 8;
  pdf.setFontSize(14);
  pdf.text(labels.title, margin, y);
  y += 8;

  pdf.setFontSize(11);
  const info = [
    `${labels.company}: ${args.company.name}`,
    `${labels.contact}: ${args.company.contactPerson || labels.empty}`,
    `${labels.phone}: ${args.company.phoneNumber || labels.empty}`,
    `${labels.address}: ${args.company.address || labels.empty}`,
    `${labels.created}: ${new Date(args.company.createdAt).toLocaleString(numberLocale)}`,
  ];
  info.forEach((line) => {
    ensureSpace();
    pdf.text(line, margin, y);
    y += 6;
  });
  y += 2;

  pdf.setFontSize(12);
  pdf.text(labels.summary, margin, y);
  y += 6;
  pdf.setFontSize(11);
  const totals = [
    [labels.totalDebt, `${args.totals.totalDebtAdded.toLocaleString(numberLocale)} ${labels.currency}`],
    [labels.totalPaid, `${args.totals.totalPaid.toLocaleString(numberLocale)} ${labels.currency}`],
    [labels.remaining, `${args.totals.remaining.toLocaleString(numberLocale)} ${labels.currency}`],
  ] as const;
  totals.forEach(([label, value]) => {
    ensureSpace();
    pdf.text(label, margin, y);
    pdf.text(value, margin + 50, y);
    y += 6;
  });
  y += 4;

  pdf.setFontSize(12);
  pdf.text(labels.timeline, margin, y);
  y += 6;
  pdf.setFontSize(9);

  args.timeline.forEach((item) => {
    ensureSpace(8);
    const date = new Date(item.createdAt).toLocaleString(numberLocale);
    const type = item.type === "DEBT" ? labels.debt : labels.payment;
    const amount = `${item.type === "DEBT" ? "+" : "-"}${item.amount.toLocaleString(numberLocale)}`;
    const attachment = item.attachmentName ? ` | ${labels.file}: ${item.attachmentName}` : "";
    const line = `${date} | ${type} | ${amount} | ${item.note || labels.empty}${attachment}`;
    const clipped = line.length > 95 ? `${line.slice(0, 92)}...` : line;
    pdf.text(clipped, margin, y);
    y += 5;
  });

  y += 4;
  ensureSpace();
  pdf.setFontSize(9);
  pdf.text(`${labels.generated}: ${(args.generatedAt ?? new Date()).toLocaleString(numberLocale)}`, margin, y);

  const blob = pdf.output("blob");
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `kompaniya_${args.company.name.replace(/\s+/g, "_")}_${Date.now()}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 5000);

  void pageWidth;
}
