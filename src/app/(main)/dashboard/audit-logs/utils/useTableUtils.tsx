"use client";

import { Badge } from "@/components/ui/badge";
import { useLocale, useTranslations } from "next-intl";

export function useTableUtils() {
  const t = useTranslations("audit");
  const locale = useLocale();
  const dateLocale = locale === "ru" ? "ru-RU" : "uz-UZ";

  const getActionBadge = (action: string, entity_type: string) => {
    if (action === "UNDO") return <Badge variant="outline">{t("actionUndo")}</Badge>;
    if (action === "CANCEL") return <Badge variant="outline">{t("actionCancel")}</Badge>;
    if (action === "DEBT_ADDED") {
      return <Badge className="bg-blue-500">{t("badgeDebtAdded")}</Badge>;
    }

    if (action === "PAYMENT_ADDED") {
      return <Badge className="bg-green-500">{t("badgePaymentAdded")}</Badge>;
    }

    if (action === "DEBT_UPDATED") {
      return <Badge className="bg-blue-500">{t("badgeDebtUpdated")}</Badge>;
    }

    if (action === "PAYMENT_UPDATED") {
      return <Badge className="bg-blue-500">{t("badgePaymentUpdated")}</Badge>;
    }

    if (action === "IMPORT") {
      return <Badge className="bg-purple-500">{t("badgeImported")}</Badge>;
    }

    if (action === "EXPORT") {
      return <Badge className="bg-indigo-500">{t("badgeExported")}</Badge>;
    }

    if (entity_type === "DEBTOR") {
      switch (action) {
        case "CREATE":
          return <Badge className="bg-green-500">{t("badgeDebtorCreated")}</Badge>;
        case "UPDATE":
          return <Badge className="bg-blue-500">{t("badgeDebtorUpdated")}</Badge>;
        case "DELETE":
          return <Badge variant="destructive">{t("badgeDebtorDeleted")}</Badge>;
        default:
          return <Badge variant="outline">{action}</Badge>;
      }
    }

    if (entity_type === "DEBT") {
      switch (action) {
        case "CREATE":
          return <Badge className="bg-blue-500">{t("badgeDebtAdded")}</Badge>;
        case "UPDATE":
          return <Badge className="bg-blue-500">{t("badgeDebtUpdated")}</Badge>;
        case "DELETE":
          return <Badge variant="destructive">{t("badgeDebtDeleted")}</Badge>;
        default:
          return <Badge variant="outline">{action}</Badge>;
      }
    }

    if (entity_type === "PAYMENT") {
      switch (action) {
        case "CREATE":
          return <Badge className="bg-green-500">{t("badgePaymentAdded")}</Badge>;
        case "UPDATE":
          return <Badge className="bg-blue-500">{t("badgePaymentUpdated")}</Badge>;
        case "DELETE":
          return <Badge variant="destructive">{t("badgePaymentDeleted")}</Badge>;
        default:
          return <Badge variant="outline">{action}</Badge>;
      }
    }

    if (entity_type === "COMPANY") {
      switch (action) {
        case "CREATE":
          return <Badge className="bg-green-500">{t("badgeCompanyCreated")}</Badge>;
        case "UPDATE":
          return <Badge className="bg-blue-500">{t("badgeCompanyUpdated")}</Badge>;
        case "DELETE":
          return <Badge variant="destructive">{t("badgeCompanyDeleted")}</Badge>;
        default:
          return <Badge variant="outline">{action}</Badge>;
      }
    }

    if (entity_type === "COMPANY_DEBT") {
      switch (action) {
        case "CREATE":
          return <Badge className="bg-blue-500">{t("badgeCompanyDebtAdded")}</Badge>;
        case "UPDATE":
          return <Badge className="bg-blue-500">{t("badgeCompanyDebtUpdated")}</Badge>;
        case "DELETE":
          return <Badge variant="destructive">{t("badgeCompanyDebtDeleted")}</Badge>;
        default:
          return <Badge variant="outline">{action}</Badge>;
      }
    }

    if (entity_type === "COMPANY_PAYMENT") {
      switch (action) {
        case "CREATE":
          return <Badge className="bg-green-500">{t("badgeCompanyPaymentAdded")}</Badge>;
        case "UPDATE":
          return <Badge className="bg-blue-500">{t("badgeCompanyPaymentUpdated")}</Badge>;
        case "DELETE":
          return <Badge variant="destructive">{t("badgeCompanyPaymentDeleted")}</Badge>;
        default:
          return <Badge variant="outline">{action}</Badge>;
      }
    }

    if (entity_type === "COMPANY_PAYMENT_RECEIPT") {
      switch (action) {
        case "DELETE":
          return <Badge variant="destructive">{t("badgeReceiptDeleted")}</Badge>;
        case "CREATE":
          return <Badge className="bg-green-500">{t("badgeReceiptAdded")}</Badge>;
        default:
          return <Badge variant="outline">{action}</Badge>;
      }
    }

    if (entity_type === "USER") {
      switch (action) {
        case "LOGIN":
          return <Badge className="bg-green-500">{t("badgeLogin")}</Badge>;
        case "LOGOUT":
          return <Badge className="bg-blue-500">{t("badgeLogout")}</Badge>;
        case "CREATE":
          return <Badge className="bg-green-500">{t("badgeUserCreated")}</Badge>;
        case "UPDATE":
          return <Badge className="bg-blue-500">{t("badgeUserUpdated")}</Badge>;
        case "DELETE":
          return <Badge variant="destructive">{t("badgeUserDeleted")}</Badge>;
        default:
          return <Badge variant="outline">{action}</Badge>;
      }
    }

    if (entity_type === "SETTINGS") {
      switch (action) {
        case "UPDATE":
          return <Badge className="bg-blue-500">{t("badgeSettingsUpdated")}</Badge>;
        default:
          return <Badge variant="outline">{action}</Badge>;
      }
    }

    if (entity_type === "PAYMENT_REMINDER") {
      return <Badge className="bg-amber-500">{t("badgeReminder")}</Badge>;
    }

    return <Badge variant="outline">{action}</Badge>;
  };

  const getEntityTypeName = (type: string) => {
    switch (type) {
      case "DEBTOR":
        return t("entityDebtor");
      case "DEBT":
        return t("entityDebt");
      case "PAYMENT":
        return t("entityPayment");
      case "USER":
        return t("entityUser");
      case "SETTINGS":
        return t("entitySettings");
      case "PAYMENT_REMINDER":
        return t("entityPaymentReminder");
      case "COMPANY":
        return t("entityCompany");
      case "COMPANY_DEBT":
        return t("entityCompanyDebt");
      case "COMPANY_PAYMENT":
        return t("entityCompanyPayment");
      case "COMPANY_PAYMENT_RECEIPT":
        return t("entityCompanyPaymentReceipt");
      case "TENANT_BACKUP":
        return t("entityTenantBackup");
      default:
        return type;
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString(dateLocale, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return { getActionBadge, getEntityTypeName, formatDate };
}

export type TableUtils = ReturnType<typeof useTableUtils>;
