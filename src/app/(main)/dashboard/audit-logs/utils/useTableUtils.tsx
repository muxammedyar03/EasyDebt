import { Badge } from "@/components/ui/badge";
import { t } from "@/lib/i18n";

export function useTableUtils() {
  const getActionBadge = (action: string, entity_type: "DEBTOR" | "DEBT" | "PAYMENT" | "USER" | "SETTINGS") => {
    if (action === "DEBT_ADDED") {
      return <Badge className="bg-blue-500">{t("auditLogs.actionDebtAdded")}</Badge>;
    }

    if (action === "PAYMENT_ADDED") {
      return <Badge className="bg-green-500">{t("auditLogs.actionPaymentAdded")}</Badge>;
    }

    if (action === "IMPORT") {
      return <Badge className="bg-purple-500">{t("auditLogs.actionImported")}</Badge>;
    }

    if (action === "EXPORT") {
      return <Badge className="bg-indigo-500">{t("auditLogs.actionExported")}</Badge>;
    }

    if (entity_type === "DEBTOR") {
      switch (action) {
        case "CREATE":
          return <Badge className="bg-green-500">{t("auditLogs.actionDebtorCreated")}</Badge>;
        case "UPDATE":
          return <Badge className="bg-blue-500">{t("auditLogs.actionDebtorUpdated")}</Badge>;
        case "DELETE":
          return <Badge variant="destructive">{t("auditLogs.actionDebtorDeleted")}</Badge>;
        default:
          return <Badge variant="outline">{action}</Badge>;
      }
    }

    if (entity_type === "PAYMENT") {
      switch (action) {
        case "UPDATE":
          return <Badge className="bg-blue-500">{t("auditLogs.actionPaid")}</Badge>;
        default:
          return <Badge variant="outline">{action}</Badge>;
      }
    }

    if (entity_type === "USER") {
      switch (action) {
        case "LOGIN":
          return <Badge className="bg-green-500">{t("auditLogs.actionLoginSystem")}</Badge>;
        case "LOGOUT":
          return <Badge className="bg-blue-500">{t("auditLogs.actionLogoutSystem")}</Badge>;
        default:
          return <Badge variant="outline">{action}</Badge>;
      }
    }

    if (entity_type === "SETTINGS") {
      switch (action) {
        case "UPDATE":
          return <Badge className="bg-blue-500">{t("auditLogs.actionModified")}</Badge>;
        default:
          return <Badge variant="outline">{action}</Badge>;
      }
    }

    return <Badge variant="outline">{action}</Badge>;
  };

  const getEntityTypeName = (type: string) => {
    switch (type) {
      case "DEBTOR":
        return t("debtors.debtor");
      case "DEBT":
        return t("auditLogs.entityDebt");
      case "PAYMENT":
        return t("auditLogs.entityPayment");
      case "USER":
        return t("nav.users");
      case "SETTINGS":
        return t("userMenu.settings");
      default:
        return type;
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString("ru-RU", {
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
