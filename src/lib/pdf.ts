"use client";
import type { jsPDF as JsPDFConstructor } from "jspdf";

export async function exportElementToPdf(opts: {
  element: HTMLElement;
  filename: string;
  margin?: number; // px around snapshot
  scale?: number; // html2canvas scale
}) {
  const { element, filename, margin = 16, scale = 2 } = opts;

  try {
    const [{ default: html2canvas }, jspdfMod] = await Promise.all([import("html2canvas"), import("jspdf")]);
    // jspdf v2 exports named jsPDF
    const { jsPDF } = jspdfMod as unknown as { jsPDF: typeof JsPDFConstructor };

    const rect = element.getBoundingClientRect();
    const canvas = await html2canvas(element, {
      backgroundColor: "#ffffff",
      scale,
      width: rect.width,
      height: rect.height,
      windowWidth: document.documentElement.clientWidth,
      windowHeight: document.documentElement.clientHeight,
      useCORS: true,
    });

    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Convert canvas size (px) to mm. 1 px ~ 0.264583 mm
    const pxToMm = (px: number) => px * 0.264583;
    const imgWidthMm = pxToMm(canvas.width);
    const imgHeightMm = pxToMm(canvas.height);

    // Fit width to page keeping aspect ratio
    const widthScale = (pageWidth - margin * 2) / imgWidthMm;
    const renderH = imgHeightMm * widthScale;

    const y = margin;
    const x = margin;

    // If content spans multiple pages, slice it
    if (renderH <= pageHeight - margin * 2) {
      pdf.addImage(imgData, "PNG", x, y, pageWidth - margin * 2, renderH, undefined, "FAST");
    } else {
      // Add segments per page height
      const pageInnerHeight = pageHeight - margin * 2;
      const totalPages = Math.ceil(renderH / pageInnerHeight);

      const pageCanvas = document.createElement("canvas");
      const pageCtx = pageCanvas.getContext("2d");
      if (!pageCtx) throw new Error("Canvas 2D context not available");

      const sliceHeightPx = Math.floor(pageInnerHeight / widthScale);
      pageCanvas.width = canvas.width;
      pageCanvas.height = sliceHeightPx;

      for (let page = 0, offsetY = 0; page < totalPages; page++, offsetY += sliceHeightPx) {
        pageCtx.clearRect(0, 0, pageCanvas.width, pageCanvas.height);
        pageCtx.drawImage(
          canvas,
          0,
          offsetY,
          canvas.width,
          Math.min(sliceHeightPx, canvas.height - offsetY),
          0,
          0,
          pageCanvas.width,
          Math.min(sliceHeightPx, canvas.height - offsetY),
        );
        const img = pageCanvas.toDataURL("image/png");
        if (page > 0) pdf.addPage();
        pdf.addImage(
          img,
          "PNG",
          x,
          y,
          pageWidth - margin * 2,
          Math.min(pageInnerHeight, renderH - page * pageInnerHeight),
          undefined,
          "FAST",
        );
      }
    }

    pdf.save(filename);
  } catch (err) {
    console.error("PDF export failed, falling back to print", err);
    window.print();
  }
}

// ========================
// Receipt-style PDF export
// ========================

type ReceiptDebtor = {
  id: number;
  first_name: string;
  last_name: string;
  phone_number: string | null;
  address: string | null;
  total_debt: number;
  created_at: string | Date;
};

type ReceiptTotals = {
  totalDebtAdded: number;
  totalPaid: number;
  remaining: number;
};

type ReceiptRating = {
  score: number;
  label: string;
};

type ReceiptTimeline = Array<{
  id: string;
  type: "DEBT" | "PAYMENT";
  amount: number;
  title: string;
  subtitle?: string | null;
  created_at: Date;
}>;

async function fetchImageAsDataURL(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function exportDebtorReceipt(args: {
  appName: string;
  logoUrl?: string; // e.g. "/favicon.ico" or "/logo.png"
  debtor: ReceiptDebtor;
  totals: ReceiptTotals;
  rating: ReceiptRating;
  timeline: ReceiptTimeline;
  generatedBy?: { id: number; username?: string; first_name?: string | null; last_name?: string | null } | null;
  generatedAt?: Date;
}) {
  const jspdfMod = await import("jspdf");
  const { jsPDF } = jspdfMod as unknown as { jsPDF: typeof JsPDFConstructor };

  const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 12;
  let y = margin;

  // Header with logo and app name
  const logoDataUrl = args.logoUrl ? await fetchImageAsDataURL(args.logoUrl) : null;
  const headerHeight = 16;
  if (logoDataUrl) {
    try {
      pdf.addImage(logoDataUrl, "PNG", margin, y, headerHeight, headerHeight); // square logo
    } catch {
      // ignore image errors
    }
  }
  pdf.setFontSize(16);
  pdf.text(args.appName, margin + (logoDataUrl ? headerHeight + 4 : 0), y + 8);
  y += headerHeight + 6;

  // Title
  pdf.setFontSize(14);
  pdf.text("Debitor hisobot (PDF)", margin, y);
  y += 6;

  // Debtor info box
  pdf.setFontSize(11);
  const debtor = args.debtor;
  const debtorName = `${debtor.first_name} ${debtor.last_name}`.trim();
  const debtorLines = [
    `F.I.Sh: ${debtorName}`,
    `Telefon: ${debtor.phone_number || "—"}`,
    `Manzil: ${debtor.address || "—"}`,
    `Qo'shilgan: ${new Date(debtor.created_at).toLocaleString("uz-UZ")}`,
  ];
  debtorLines.forEach((line) => {
    pdf.text(line, margin, y);
    y += 6;
  });
  y += 2;

  // Totals section
  pdf.setFontSize(12);
  pdf.text("Umumiy ma'lumotlar", margin, y);
  y += 6;
  pdf.setFontSize(11);
  const totals = args.totals;
  const totalsRows: Array<[string, string]> = [
    ["Umumiy qarz", `${totals.totalDebtAdded.toLocaleString()} so'm`],
    ["Umumiy to'lov", `${totals.totalPaid.toLocaleString()} so'm`],
    ["Qolgan qarz", `${totals.remaining.toLocaleString()} so'm`],
    ["Reyting", `${args.rating.label} ( ${args.rating.score}/100 )`],
  ];
  const labelWidth = 60; // mm
  totalsRows.forEach(([label, value]) => {
    pdf.text(label, margin, y);
    pdf.text(value, margin + labelWidth, y);
    y += 6;
  });
  y += 2;

  // Timeline section
  pdf.setFontSize(12);
  pdf.text("Vaqt chizig'i", margin, y);
  y += 6;
  pdf.setFontSize(10);

  // Table configuration
  const innerWidth = pageWidth - margin * 2;
  const colPaddingX = 2; // mm
  const rowPaddingY = 2; // mm
  const baseLineHeight = 4.5; // mm per line

  // Columns: Date, Type, Title, Amount, Note (sum should equal innerWidth)
  const columns = [
    { key: "date", title: "Sana", width: 36 },
    { key: "type", title: "Turi", width: 24 },
    { key: "title", title: "Sarlavha", width: 66 },
    { key: "amount", title: "Miqdori", width: 30 },
    { key: "note", title: "Izoh", width: innerWidth - (36 + 24 + 66 + 30) },
  ] as const;

  const drawHeader = () => {
    // Draw header row with bold font
    pdf.setFontSize(10);
    let x = margin;
    const maxHeight = baseLineHeight + rowPaddingY * 2;
    // Draw header cells
    columns.forEach((c) => {
      pdf.rect(x, y, c.width, maxHeight);
      pdf.text(c.title, x + colPaddingX, y + rowPaddingY + baseLineHeight - 1.2);
      x += c.width;
    });
    y += maxHeight;
  };

  const wrapCell = (text: string, maxWidth: number) => {
    if (!text) return [""];
    const words = text.split(" ");
    const lines: string[] = [];
    let current = "";
    for (const w of words) {
      const next = current ? current + " " + w : w;
      if (pdf.getTextWidth(next) > maxWidth - colPaddingX * 2) {
        if (current) lines.push(current);
        current = w;
      } else {
        current = next;
      }
    }
    if (current) lines.push(current);
    return lines.length ? lines : [""];
  };

  const ensureSpace = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin) {
      pdf.addPage();
      y = margin;
      drawHeader();
    }
  };

  // Draw header initially
  drawHeader();

  // Rows
  for (const ev of args.timeline) {
    const dateStr = ev.created_at.toLocaleString("uz-UZ");
    const typeStr = ev.type === "DEBT" ? "Qarz" : "To'lov";
    const amountStr = `${ev.type === "DEBT" ? "+" : "-"}${ev.amount.toLocaleString()} so'm`;
    const noteStr = ev.subtitle ? `${ev.subtitle}` : "";

    const cellLines = {
      date: wrapCell(dateStr, columns[0].width),
      type: wrapCell(typeStr, columns[1].width),
      title: wrapCell(ev.title, columns[2].width),
      amount: wrapCell(amountStr, columns[3].width),
      note: wrapCell(
        noteStr == "CASH" ? "Naqd" : noteStr == "CLICK" ? "Click" : noteStr == "CARD" ? "Karta" : noteStr,
        columns[4].width,
      ),
    };

    const lineCounts = Object.values(cellLines).map((ls) => ls.length);
    const maxLines = Math.max(...lineCounts);
    const rowHeight = maxLines * baseLineHeight + rowPaddingY * 2;

    ensureSpace(rowHeight);

    // Draw row cells
    let x = margin;
    // date
    pdf.rect(x, y, columns[0].width, rowHeight);
    cellLines.date.forEach((l, i) => pdf.text(l, x + colPaddingX, y + rowPaddingY + (i + 1) * baseLineHeight - 1.2));
    x += columns[0].width;
    // type (colored)
    pdf.rect(x, y, columns[1].width, rowHeight);
    // Color: red for debt, green for payment
    if (ev.type === "DEBT") pdf.setTextColor(200, 0, 0);
    else pdf.setTextColor(0, 130, 60);
    cellLines.type.forEach((l, i) => pdf.text(l, x + colPaddingX, y + rowPaddingY + (i + 1) * baseLineHeight - 1.2));
    pdf.setTextColor(0, 0, 0);
    x += columns[1].width;
    // title
    pdf.rect(x, y, columns[2].width, rowHeight);
    cellLines.title.forEach((l, i) => pdf.text(l, x + colPaddingX, y + rowPaddingY + (i + 1) * baseLineHeight - 1.2));
    x += columns[2].width;
    // amount (right-aligned and colored)
    pdf.rect(x, y, columns[3].width, rowHeight);
    if (ev.type === "DEBT") pdf.setTextColor(200, 0, 0);
    else pdf.setTextColor(0, 130, 60);
    const amountRightX = x + columns[3].width - colPaddingX;
    cellLines.amount.forEach((l, i) => {
      const tw = pdf.getTextWidth(l);
      pdf.text(l, amountRightX - tw, y + rowPaddingY + (i + 1) * baseLineHeight - 1.2);
    });
    pdf.setTextColor(0, 0, 0);
    x += columns[3].width;
    // note
    pdf.rect(x, y, columns[4].width, rowHeight);
    cellLines.note.forEach((l, i) => pdf.text(l, x + colPaddingX, y + rowPaddingY + (i + 1) * baseLineHeight - 1.2));

    y += rowHeight;
  }

  // Footer
  const by = args.generatedBy;
  const at = args.generatedAt ?? new Date();
  const footer: string = `Yuklangan: ${at.toLocaleString("uz-UZ")}  •  Foydalanuvchi: ${
    by ? by.username || `${by.first_name || ""} ${by.last_name || ""}`.trim() || `#${by.id}` : "—"
  }`;
  pdf.setFontSize(9);
  pdf.text(footer, margin, pageHeight - margin);

  pdf.save(`debtor-${args.debtor.id}.pdf`);
  return;
}
