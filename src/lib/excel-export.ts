// Excel export utility using xlsx library for true .xlsx format
import * as XLSX from "xlsx";

export interface ExportData {
  headers: string[];
  rows: (string | number)[][];
  filename: string;
}

export function exportToExcel(data: ExportData) {
  // Create a new workbook
  const workbook = XLSX.utils.book_new();

  // Combine headers and rows
  const worksheetData = [data.headers, ...data.rows];

  // Create worksheet from array of arrays
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  // Set column widths for better readability
  const columnWidths = data.headers.map((header, index) => {
    // Calculate max width based on header and data
    const headerWidth = header.length;
    const dataWidths = data.rows.map((row) => String(row[index] || "").length);
    const maxDataWidth = Math.max(...dataWidths, 0);
    return { wch: Math.max(headerWidth, maxDataWidth, 10) };
  });
  worksheet["!cols"] = columnWidths;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, "Qarzdorlar");

  // Generate Excel file and trigger download
  XLSX.writeFile(workbook, `${data.filename}.xlsx`);
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
export function formatNumberForExcel(num: number): string {
  return num.toLocaleString("uz-UZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
