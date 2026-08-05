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

export async function exportCompanyReceipt(args: {
  appName: string;
  company: CompanyDomain;
  totals: { totalDebtAdded: number; totalPaid: number; remaining: number };
  timeline: CompanyTimelineItem[];
  generatedAt?: Date;
}) {
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
  pdf.text("Kompaniya qarz hisoboti (PDF)", margin, y);
  y += 8;

  pdf.setFontSize(11);
  const info = [
    `Kompaniya: ${args.company.name}`,
    `Mas'ul: ${args.company.contactPerson || "—"}`,
    `Telefon: ${args.company.phoneNumber || "—"}`,
    `Manzil: ${args.company.address || "—"}`,
    `Yaratilgan: ${new Date(args.company.createdAt).toLocaleString("uz-UZ")}`,
  ];
  info.forEach((line) => {
    ensureSpace();
    pdf.text(line, margin, y);
    y += 6;
  });
  y += 2;

  pdf.setFontSize(12);
  pdf.text("Umumiy", margin, y);
  y += 6;
  pdf.setFontSize(11);
  const totals = [
    ["Umumiy qarz", `${args.totals.totalDebtAdded.toLocaleString("uz-UZ")} so'm`],
    ["Umumiy to'lov", `${args.totals.totalPaid.toLocaleString("uz-UZ")} so'm`],
    ["Qolgan qarz", `${args.totals.remaining.toLocaleString("uz-UZ")} so'm`],
  ] as const;
  totals.forEach(([label, value]) => {
    ensureSpace();
    pdf.text(label, margin, y);
    pdf.text(value, margin + 50, y);
    y += 6;
  });
  y += 4;

  pdf.setFontSize(12);
  pdf.text("Vaqt chizig'i", margin, y);
  y += 6;
  pdf.setFontSize(9);

  args.timeline.forEach((item) => {
    ensureSpace(8);
    const date = new Date(item.createdAt).toLocaleString("uz-UZ");
    const type = item.type === "DEBT" ? "Qarz" : "To'lov";
    const amount = `${item.type === "DEBT" ? "+" : "-"}${item.amount.toLocaleString("uz-UZ")}`;
    const attachment = item.attachmentName ? ` | Fayl: ${item.attachmentName}` : "";
    const line = `${date} | ${type} | ${amount} | ${item.note || "—"}${attachment}`;
    const clipped = line.length > 95 ? `${line.slice(0, 92)}...` : line;
    pdf.text(clipped, margin, y);
    y += 5;
  });

  y += 4;
  ensureSpace();
  pdf.setFontSize(9);
  pdf.text(`Yaratilgan: ${(args.generatedAt ?? new Date()).toLocaleString("uz-UZ")}`, margin, y);

  const blob = pdf.output("blob");
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `kompaniya_${args.company.name.replace(/\s+/g, "_")}_${Date.now()}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 5000);

  // silence unused
  void pageWidth;
}
