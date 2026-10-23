/**
 * RECEIPT PRINTER — Print Logic (Web & Tauri Desktop Thermal Printer)
 *
 * Iframe va Tauri v2 native print integratsiyasi yordamida 80mm / 58mm
 * termal printerga chek chop etish.
 */

import { generateSingleReceiptHtml, generateTimelineReceiptHtml } from "./format-receipt";
import type { SingleReceiptData, TimelineReceiptData } from "../model/types";
import { getPreferredThermalWidth, invokeTauriCommand, isTauriDesktop } from "@/lib/desktop/tauri-bridge";

const RECEIPT_CONTAINER_ID = "receipt-print-area";

export function getReceiptContainerId(): string {
  return RECEIPT_CONTAINER_ID;
}

function getReceiptPrintStyles(paperWidth: "80mm" | "58mm" = "80mm"): string {
  const maxWidth = paperWidth === "58mm" ? "54mm" : "76mm";
  const baseFontSize = paperWidth === "58mm" ? "11px" : "12px";

  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: ${baseFontSize};
      line-height: 1.4;
      color: #000;
      background: #fff;
      width: ${maxWidth};
      max-width: ${maxWidth};
      margin: 0 auto;
      padding: 3mm 1.5mm;
    }
    .receipt-header { text-align: center; margin-bottom: 4mm; }
    .receipt-app-name {
      font-size: 18px; font-weight: 900;
      letter-spacing: 2px; text-transform: uppercase;
      margin: 0; padding: 0;
    }
    .receipt-divider {
      font-size: 10px; letter-spacing: 3px;
      margin: 1mm 0; color: #555;
    }
    .receipt-type {
      font-size: 14px; font-weight: 700; text-align: center;
      margin: 2mm 0; padding: 1mm 0;
      border-top: 1px dashed #000; border-bottom: 1px dashed #000;
    }
    .receipt-section { margin: 2mm 0; }
    .receipt-section-title {
      font-size: 12px; font-weight: 700; text-align: center;
      margin: 1mm 0 2mm; text-decoration: underline;
    }
    .receipt-doc-info { margin-bottom: 2mm; }
    .receipt-row {
      display: flex; justify-content: space-between;
      align-items: flex-start; padding: 0.5mm 0; gap: 2mm;
    }
    .receipt-label { font-weight: 400; white-space: nowrap; flex-shrink: 0; }
    .receipt-value { font-weight: 600; text-align: right; word-break: break-word; font-variant-numeric: tabular-nums; }
    .receipt-row-bold .receipt-label,
    .receipt-row-bold .receipt-value { font-weight: 700; font-size: 13px; }
    .receipt-line { border-top: 1px dashed #000; margin: 2mm 0; }
    .receipt-amount-section .receipt-row-bold .receipt-value { font-size: 14px; }
    .receipt-table {
      width: 100%; border-collapse: collapse;
      font-size: 10px; margin-top: 1mm;
    }
    .receipt-table th, .receipt-table td {
      border: 1px solid #000; padding: 1mm; text-align: left;
    }
    .receipt-table th {
      font-weight: 700; font-size: 10px; background: #f0f0f0;
    }
    .receipt-table td { font-size: 9px; font-variant-numeric: tabular-nums; }
    .receipt-debt { font-weight: 600; }
    .receipt-payment { font-weight: 600; }
    .receipt-footer { text-align: center; margin-top: 4mm; font-size: 11px; }
    .receipt-footer p { margin: 1mm 0; }
    .receipt-app-url { font-size: 9px; color: #666; }
    @page { margin: 2mm; size: ${paperWidth} auto; }
  `;
}

/**
 * Chek chop etish (Tauri Desktop + Web Iframe)
 */
export function printReceipt(data?: SingleReceiptData | TimelineReceiptData | null, onAfterPrint?: () => void): void {
  let receiptHtml = "";

  if (data) {
    if ("timeline" in data) {
      receiptHtml = generateTimelineReceiptHtml(data);
    } else {
      receiptHtml = generateSingleReceiptHtml(data);
    }
  } else {
    const receiptEl = document.getElementById(RECEIPT_CONTAINER_ID);
    if (receiptEl) {
      receiptHtml = receiptEl.innerHTML;
    }
  }

  if (!receiptHtml || !receiptHtml.trim()) {
    console.warn("Receipt print cancelled: Empty HTML content");
    return;
  }

  const paperWidth = getPreferredThermalWidth();

  if (isTauriDesktop()) {
    void invokeTauriCommand("print_thermal_receipt", {
      html: receiptHtml,
      paper_width: paperWidth,
    });
  }

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  iframe.style.opacity = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) {
    console.error("Cannot access iframe document");
    document.body.removeChild(iframe);
    return;
  }

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>EasyDebt Chek (${paperWidth})</title>
      <style>${getReceiptPrintStyles(paperWidth)}</style>
    </head>
    <body>${receiptHtml}</body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      onAfterPrint?.();
    } catch (err) {
      console.error("Print failed:", err);
    }

    setTimeout(() => {
      if (iframe.parentNode) {
        document.body.removeChild(iframe);
      }
    }, 2000);
  }, 300);
}
