"use client";

/**
 * RECEIPT TEMPLATE — Chek shablon komponenti
 *
 * Ikki rejim:
 * 1. Print: receipt-print-area (hidden) — iframe print uchun HTML manba sifatida
 * 2. Preview: receipt-preview (visible) — dialog ichida ko'rish uchun
 */

import * as React from "react";
import type { SingleReceiptData, TimelineReceiptData } from "../model";
import { formatReceiptAmount, formatReceiptDate, formatReceiptTitle, formatPaymentType } from "../lib/format-receipt";
import { getReceiptContainerId } from "../lib/print-receipt";
import { APP_CONFIG } from "@/config/app-config";

// ─── Single Receipt Content (shared between print and preview) ─

function SingleReceiptContent({ data }: { data: SingleReceiptData }) {
  return (
    <div className="receipt">
      {/* Header */}
      <div className="receipt-header">
        <h1 className="receipt-app-name">FEAT MARKET</h1>
        <div className="receipt-divider">─── ✦ ───</div>
      </div>

      {/* Transaction type */}
      <div className="receipt-section">
        <h2 className="receipt-type">{formatReceiptTitle(data.type)}</h2>
      </div>

      {/* Document info */}
      <div className="receipt-section receipt-doc-info">
        <div className="receipt-row">
          <span className="receipt-label">Dok №:</span>
          <span className="receipt-value">{data.docNumber}</span>
        </div>
        <div className="receipt-row">
          <span className="receipt-label">Sana:</span>
          <span className="receipt-value">{formatReceiptDate(data.date)}</span>
        </div>
      </div>

      <div className="receipt-line" />

      {/* Debtor info */}
      <div className="receipt-section">
        <div className="receipt-row">
          <span className="receipt-label">Qarzdor:</span>
          <span className="receipt-value">{data.debtorName}</span>
        </div>
        {data.debtorPhone && (
          <div className="receipt-row">
            <span className="receipt-label">Telefon:</span>
            <span className="receipt-value">{data.debtorPhone}</span>
          </div>
        )}
        {data.employeeName && (
          <div className="receipt-row">
            <span className="receipt-label">Xodim:</span>
            <span className="receipt-value">{data.employeeName}</span>
          </div>
        )}
      </div>

      <div className="receipt-line" />

      {/* Amount section */}
      <div className="receipt-section receipt-amount-section">
        <div className="receipt-row receipt-row-bold">
          <span className="receipt-label">Miqdor:</span>
          <span className="receipt-value">{formatReceiptAmount(data.amount)} so&apos;m</span>
        </div>
        {data.type === "PAYMENT" && data.paymentType && (
          <div className="receipt-row">
            <span className="receipt-label">To&apos;lov turi:</span>
            <span className="receipt-value">{formatPaymentType(data.paymentType)}</span>
          </div>
        )}
        {data.description && (
          <div className="receipt-row">
            <span className="receipt-label">Izoh:</span>
            <span className="receipt-value">{data.description}</span>
          </div>
        )}
      </div>

      <div className="receipt-line" />

      {/* Balance section */}
      <div className="receipt-section">
        <div className="receipt-row">
          <span className="receipt-label">Oldingi qoldiq:</span>
          <span className="receipt-value">{formatReceiptAmount(data.previousBalance)} so&apos;m</span>
        </div>
        <div className="receipt-row receipt-row-bold">
          <span className="receipt-label">Yangi qoldiq:</span>
          <span className="receipt-value">{formatReceiptAmount(data.newBalance)} so&apos;m</span>
        </div>
      </div>

      <div className="receipt-line" />

      {/* Footer */}
      <div className="receipt-footer">
        <p>* * * Rahmat! * * *</p>
        <p className="receipt-app-url">{APP_CONFIG.name}</p>
      </div>
    </div>
  );
}

// ─── Timeline Receipt Content ──────────────────────────────────

function TimelineReceiptContent({ data }: { data: TimelineReceiptData }) {
  return (
    <div className="receipt">
      {/* Header */}
      <div className="receipt-header">
        <h1 className="receipt-app-name">FEAT MARKET</h1>
        <div className="receipt-divider">─── ✦ ───</div>
        <h2 className="receipt-type">HISOBOT</h2>
      </div>

      {/* Debtor info */}
      <div className="receipt-section receipt-doc-info">
        <div className="receipt-row">
          <span className="receipt-label">Qarzdor:</span>
          <span className="receipt-value">{data.debtorName}</span>
        </div>
        {data.debtorPhone && (
          <div className="receipt-row">
            <span className="receipt-label">Telefon:</span>
            <span className="receipt-value">{data.debtorPhone}</span>
          </div>
        )}
        {data.debtorAddress && (
          <div className="receipt-row">
            <span className="receipt-label">Manzil:</span>
            <span className="receipt-value">{data.debtorAddress}</span>
          </div>
        )}
        {data.employeeName && (
          <div className="receipt-row">
            <span className="receipt-label">Xodim:</span>
            <span className="receipt-value">{data.employeeName}</span>
          </div>
        )}
        <div className="receipt-row">
          <span className="receipt-label">Sana:</span>
          <span className="receipt-value">{formatReceiptDate(data.generatedAt)}</span>
        </div>
      </div>

      <div className="receipt-line" />

      {/* Totals */}
      <div className="receipt-section">
        <div className="receipt-row">
          <span className="receipt-label">Umumiy qarz:</span>
          <span className="receipt-value">{formatReceiptAmount(data.totalDebt)} so&apos;m</span>
        </div>
        <div className="receipt-row">
          <span className="receipt-label">Umumiy to&apos;lov:</span>
          <span className="receipt-value">{formatReceiptAmount(data.totalPaid)} so&apos;m</span>
        </div>
        <div className="receipt-row receipt-row-bold">
          <span className="receipt-label">Qolgan qarz:</span>
          <span className="receipt-value">{formatReceiptAmount(data.remaining)} so&apos;m</span>
        </div>
      </div>

      <div className="receipt-line" />

      {/* Timeline table */}
      <div className="receipt-section">
        <h3 className="receipt-section-title">Tarix</h3>
        <table className="receipt-table">
          <thead>
            <tr>
              <th>№</th>
              <th>Sana</th>
              <th>Turi</th>
              <th>Miqdor</th>
            </tr>
          </thead>
          <tbody>
            {data.timeline.map((item, index) => (
              <tr key={index}>
                <td>{index + 1}</td>
                <td>{formatReceiptDate(item.date)}</td>
                <td>{item.type === "DEBT" ? "Qarz" : "To'lov"}</td>
                <td className={item.type === "DEBT" ? "receipt-debt" : "receipt-payment"}>
                  {item.type === "DEBT" ? "+" : "-"}
                  {formatReceiptAmount(item.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="receipt-line" />

      {/* Footer */}
      <div className="receipt-footer">
        <p>* * * Rahmat! * * *</p>
        <p className="receipt-app-url">{APP_CONFIG.name}</p>
      </div>
    </div>
  );
}

// ─── Public Components ─────────────────────────────────────────

/** Hidden print source — iframe printReceipt() shu div ni o'qiydi */
export function SingleReceiptTemplate({ data }: { data: SingleReceiptData | null }) {
  if (!data) return null;
  return (
    <div id={getReceiptContainerId()} className="receipt-print-area">
      <SingleReceiptContent data={data} />
    </div>
  );
}

/** Hidden print source — iframe printReceipt() shu div ni o'qiydi */
export function TimelineReceiptTemplate({ data }: { data: TimelineReceiptData | null }) {
  if (!data) return null;
  return (
    <div id={getReceiptContainerId()} className="receipt-print-area">
      <TimelineReceiptContent data={data} />
    </div>
  );
}

/** Preview — dialog ichida chekni ko'rsatish uchun */
export function SingleReceiptPreview({ data }: { data: SingleReceiptData }) {
  return (
    <div className="receipt-preview">
      <SingleReceiptContent data={data} />
    </div>
  );
}

/** Preview — dialog ichida chekni ko'rsatish uchun */
export function TimelineReceiptPreview({ data }: { data: TimelineReceiptData }) {
  return (
    <div className="receipt-preview">
      <TimelineReceiptContent data={data} />
    </div>
  );
}
