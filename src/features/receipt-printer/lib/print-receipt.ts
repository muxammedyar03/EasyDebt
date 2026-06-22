/**
 * RECEIPT PRINTER — Print Logic
 *
 * Iframe yordamida termal printerga chek chop etish.
 * Bu yondashuv barcha @media print muammolarini hal qiladi va React batch state
 * yangilanishlaridan mustaqil ishlaydi (HTML kod sinxron hosil qilinadi).
 */

import { generateSingleReceiptHtml, generateTimelineReceiptHtml } from "./format-receipt";
import type { SingleReceiptData, TimelineReceiptData } from "../model/types";

const RECEIPT_CONTAINER_ID = "receipt-print-area";

export function getReceiptContainerId(): string {
  return RECEIPT_CONTAINER_ID;
}

function getReceiptPrintStyles(): string {
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 12px;
      line-height: 1.4;
      color: #000;
      background: #fff;
      padding: 4mm 2mm;
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
    .receipt-value { font-weight: 600; text-align: right; word-break: break-word; }
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
    .receipt-table td { font-size: 9px; }
    .receipt-debt { font-weight: 600; }
    .receipt-payment { font-weight: 600; }
    .receipt-footer { text-align: center; margin-top: 4mm; font-size: 11px; }
    .receipt-footer p { margin: 1mm 0; }
    .receipt-app-url { font-size: 9px; color: #666; }
    @page { margin: 2mm; size: auto; }
  `;
}

/**
 * Chek chop etish.
 *
 * Agar `data` berilgan bo'lsa, uni sinxron ravishda HTMLga o'tkazib iframe orqali print qiladi.
 * Agar `data` berilmasa, DOMdan hidden `receipt-print-area`ni izlaydi (fallback).
 */
export function printReceipt(data?: SingleReceiptData | TimelineReceiptData | null, onAfterPrint?: () => void): void {
  let receiptHtml = "";

  if (data) {
    // Sinxron ravishda to'g'ridan-to'g'ri HTML generatsiya qilish (Timing bugni oldini oladi!)
    if ("timeline" in data) {
      receiptHtml = generateTimelineReceiptHtml(data);
    } else {
      receiptHtml = generateSingleReceiptHtml(data);
    }
  } else {
    // DOMdan qidirish (fallback)
    const receiptEl = document.getElementById(RECEIPT_CONTAINER_ID);
    if (receiptEl) {
      receiptHtml = receiptEl.innerHTML;
    }
  }

  if (!receiptHtml || !receiptHtml.trim()) {
    console.warn("Receipt print cancelled: Empty HTML content");
    return;
  }

  // Iframe yaratish
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
      <title>Chek</title>
      <style>${getReceiptPrintStyles()}</style>
    </head>
    <body>${receiptHtml}</body>
    </html>
  `);
  doc.close();

  // Print qilish va tozalash
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
