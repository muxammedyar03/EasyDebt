/**
 * RECEIPT PRINTER — Format Utilities
 *
 * Chek uchun sana, summa va boshqa ma'lumotlarni formatlash.
 */

/**
 * Summani formatlash: 26000000 → "26 000 000"
 */
export function formatReceiptAmount(amount: number): string {
  return Math.abs(amount).toLocaleString("uz-UZ");
}

/**
 * Sanani formatlash: Date → "21.05.2026 14:30:23"
 */
export function formatReceiptDate(date: Date): string {
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();
  const hours = d.getHours().toString().padStart(2, "0");
  const minutes = d.getMinutes().toString().padStart(2, "0");
  const seconds = d.getSeconds().toString().padStart(2, "0");
  return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
}

/**
 * To'lov turini o'zbek tiliga tarjima qilish
 */
import { APP_CONFIG } from "@/config/app-config";
import type { SingleReceiptData, TimelineReceiptData } from "../model/types";

/**
 * To'lov turini o'zbek tiliga tarjima qilish
 */
export function formatPaymentType(type: "CASH" | "CLICK" | "CARD"): string {
  const map: Record<string, string> = {
    CASH: "Naqd",
    CLICK: "Click",
    CARD: "Karta",
  };
  return map[type] || type;
}

/**
 * Receipt type ni sarlavhaga aylantirish
 */
export function formatReceiptTitle(type: "DEBT" | "PAYMENT"): string {
  return type === "DEBT" ? "ДОЛГ ДОБАВЛЕН" : "ПЛАТЕЖ ПОЛУЧЕН";
}

/**
 * Single receipt HTML generator
 */
export function generateSingleReceiptHtml(data: SingleReceiptData): string {
  return `
    <div class="receipt">
      <div class="receipt-header">
        <h1 class="receipt-app-name">FEAT MARKET</h1>
        <div class="receipt-divider">─── ✦ ───</div>
      </div>
      <div class="receipt-section">
        <h2 class="receipt-type">${formatReceiptTitle(data.type)}</h2>
      </div>
      <div class="receipt-section receipt-doc-info">
        <div class="receipt-row">
          <span class="receipt-label">Документ №:</span>
          <span class="receipt-value">${data.docNumber}</span>
        </div>
        <div class="receipt-row">
          <span class="receipt-label">Дата:</span>
          <span class="receipt-value">${formatReceiptDate(data.date)}</span>
        </div>
      </div>
      <div class="receipt-line"></div>
      <div class="receipt-section">
        <div class="receipt-row">
          <span class="receipt-label">Дебитор:</span>
          <span class="receipt-value">${data.debtorName}</span>
        </div>
        ${
          data.debtorPhone
            ? `
        <div class="receipt-row">
          <span class="receipt-label">Телефон:</span>
          <span class="receipt-value">${data.debtorPhone}</span>
        </div>
        `
            : ""
        }
        ${
          data.employeeName
            ? `
        <div class="receipt-row">
          <span class="receipt-label">Сотрудник:</span>
          <span class="receipt-value">${data.employeeName}</span>
        </div>
        `
            : ""
        }
      </div>
      <div class="receipt-line"></div>
      <div class="receipt-section receipt-amount-section">
        <div class="receipt-row receipt-row-bold">
          <span class="receipt-label">Сумма:</span>
          <span class="receipt-value">${formatReceiptAmount(data.amount)} so&apos;m</span>
        </div>
        ${
          data.type === "PAYMENT" && data.paymentType
            ? `
        <div class="receipt-row">
          <span class="receipt-label">Тип платежа:</span>
          <span class="receipt-value">${formatPaymentType(data.paymentType)}</span>
        </div>
        `
            : ""
        }
        ${
          data.description
            ? `
        <div class="receipt-row">
          <span class="receipt-label">Описание:</span>
          <span class="receipt-value">${data.description}</span>
        </div>
        `
            : ""
        }
      </div>
      <div class="receipt-line"></div>
      <div class="receipt-section">
        <div class="receipt-row">
          <span class="receipt-label">Предыдущий остаток:</span>
          <span class="receipt-value">${formatReceiptAmount(data.previousBalance)} so&apos;m</span>
        </div>
        <div class="receipt-row receipt-row-bold">
          <span class="receipt-label">Новый остаток:</span>
          <span class="receipt-value">${formatReceiptAmount(data.newBalance)} so&apos;m</span>
        </div>
      </div>
      <div class="receipt-line"></div>
      <div class="receipt-footer">
        <p>* * * Спасибо! * * *</p>
        <p class="receipt-app-url">${APP_CONFIG.name}</p>
      </div>
    </div>
  `;
}

/**
 * Timeline receipt HTML generator
 */
export function generateTimelineReceiptHtml(data: TimelineReceiptData): string {
  const rows = data.timeline
    .map(
      (item, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${formatReceiptDate(item.date)}</td>
      <td>${item.type === "DEBT" ? "Qarz" : "To'lov"}</td>
      <td class="${item.type === "DEBT" ? "receipt-debt" : "receipt-payment"}">
        ${item.type === "DEBT" ? "+" : "-"}${formatReceiptAmount(item.amount)}
      </td>
    </tr>
  `,
    )
    .join("");

  return `
    <div class="receipt">
      <div class="receipt-header">
        <h1 class="receipt-app-name">FEAT MARKET</h1>
        <div class="receipt-divider">─── ✦ ───</div>
        <h2 class="receipt-type">HISOBOT</h2>
      </div>
      <div class="receipt-section receipt-doc-info">
        <div class="receipt-row">
          <span class="receipt-label">Qarzdor:</span>
          <span class="receipt-value">${data.debtorName}</span>
        </div>
        ${
          data.debtorPhone
            ? `
        <div class="receipt-row">
          <span class="receipt-label">Telefon:</span>
          <span class="receipt-value">${data.debtorPhone}</span>
        </div>
        `
            : ""
        }
        ${
          data.debtorAddress
            ? `
        <div class="receipt-row">
          <span class="receipt-label">Manzil:</span>
          <span class="receipt-value">${data.debtorAddress}</span>
        </div>
        `
            : ""
        }
        ${
          data.employeeName
            ? `
        <div class="receipt-row">
          <span class="receipt-label">Xodim:</span>
          <span class="receipt-value">${data.employeeName}</span>
        </div>
        `
            : ""
        }
        <div class="receipt-row">
          <span class="receipt-label">Sana:</span>
          <span class="receipt-value">${formatReceiptDate(data.generatedAt)}</span>
        </div>
      </div>
      <div class="receipt-line"></div>
      <div class="receipt-section">
        <div class="receipt-row">
          <span class="receipt-label">Umumiy qarz:</span>
          <span class="receipt-value">${formatReceiptAmount(data.totalDebt)} so&apos;m</span>
        </div>
        <div class="receipt-row">
          <span class="receipt-label">Umumiy to&apos;lov:</span>
          <span class="receipt-value">${formatReceiptAmount(data.totalPaid)} so&apos;m</span>
        </div>
        <div class="receipt-row receipt-row-bold">
          <span class="receipt-label">Qolgan qarz:</span>
          <span class="receipt-value">${formatReceiptAmount(data.remaining)} so&apos;m</span>
        </div>
      </div>
      <div class="receipt-line"></div>
      <div class="receipt-section">
        <h3 class="receipt-section-title">Tarix</h3>
        <table class="receipt-table">
          <thead>
            <tr>
              <th>№</th>
              <th>Sana</th>
              <th>Turi</th>
              <th>Miqdor</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
      <div class="receipt-line"></div>
      <div class="receipt-footer">
        <p>* * * Rahmat! * * *</p>
        <p class="receipt-app-url">${APP_CONFIG.name}</p>
      </div>
    </div>
  `;
}
