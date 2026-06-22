/**
 * Qarzdorlar ro'yxati: jami qarz va limit bo'yicha badge/rang (UI presentation).
 * Service/domain dagi overdue hisobidan mustaqil — faqat limit / to'langan ko'rinishi.
 */

import { t } from "@/lib/i18n";

export type DebtorDebtLimitBandPresentation = {
  label: string;
  variant: "default" | "destructive" | "secondary" | "outline";
  /** Qarz summasi ustunidagi matn rangi */
  amountClassName: string;
  /** Status badge uchun qo'shimcha fon/rang */
  badgeClassName: string;
};

export function getDebtorDebtLimitBandPresentation(
  totalDebt: number,
  debtLimit: number,
): DebtorDebtLimitBandPresentation {
  if (totalDebt <= 0) {
    return {
      label: t("debtors.paid"),
      variant: "default",
      amountClassName: "text-green-600",
      badgeClassName: "bg-green-600/20 text-green-700 dark:text-green-500",
    };
  }
  if (totalDebt > debtLimit) {
    return {
      label: t("debtors.overLimit"),
      variant: "default",
      amountClassName: "text-red-600",
      badgeClassName: "bg-red-600/15 text-red-700 dark:text-red-500",
    };
  }
  return {
    label: t("debtors.debtorStatus"),
    variant: "secondary",
    amountClassName: "text-yellow-600",
    badgeClassName: "bg-yellow-600/20 text-yellow-800 dark:text-yellow-500",
  };
}
