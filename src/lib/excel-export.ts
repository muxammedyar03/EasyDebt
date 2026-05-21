// Excel export utility using ExcelJS for .xlsx format (browser & Node)
import * as ExcelJS from "exceljs";

export interface ExportData {
  headers: string[];
  rows: (string | number)[][];
  filename: string;
}

export async function exportToExcel(data: ExportData): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Qarzdorlar", { headerFooter: { firstHeader: "", firstFooter: "" } });

  // Headers row
  worksheet.addRow(data.headers);
  // Data rows
  data.rows.forEach((row) => worksheet.addRow(row));

  // Column widths
  data.headers.forEach((header, index) => {
    const headerWidth = header.length;
    const dataWidths = data.rows.map((row) => String(row[index] ?? "").length);
    const maxDataWidth = Math.max(0, ...dataWidths);
    worksheet.getColumn(index + 1).width = Math.max(headerWidth, maxDataWidth, 10);
  });

  // Browser: write to buffer and trigger download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${data.filename}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 5000);
}

// Format date for Excel
export function formatDateForExcel(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("uz-UZ", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

// Format number for Excel
export function formatNumberForExcel(num: number | undefined | null): string {
  if (num === undefined || num === null || isNaN(num)) {
    return "0.00";
  }
  return num.toLocaleString("uz-UZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
