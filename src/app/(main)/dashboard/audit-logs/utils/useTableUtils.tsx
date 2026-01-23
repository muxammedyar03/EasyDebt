import { Badge } from "@/components/ui/badge";

export function useTableUtils() {
  const getActionBadge = (action: string, entity_type: "DEBTOR" | "DEBT" | "PAYMENT" | "USER" | "SETTINGS") => {
    // Action-based badges
    if (action === "DEBT_ADDED") {
      return <Badge className="bg-blue-500">Qarz qo&apos;shildi</Badge>;
    }

    if (action === "PAYMENT_ADDED") {
      return <Badge className="bg-green-500">To&apos;lov qo&apos;shildi</Badge>;
    }

    if (action === "IMPORT") {
      return <Badge className="bg-purple-500">Import qilindi</Badge>;
    }

    if (action === "EXPORT") {
      return <Badge className="bg-indigo-500">Export qilindi</Badge>;
    }

    // Entity-based badges
    if (entity_type === "DEBTOR") {
      switch (action) {
        case "CREATE":
          return <Badge className="bg-green-500">Qarzdor yaratildi</Badge>;
        case "UPDATE":
          return <Badge className="bg-blue-500">Qarzdor yangilandi</Badge>;
        case "DELETE":
          return <Badge variant="destructive">Qarzdor o&apos;chirildi</Badge>;
        default:
          return <Badge variant="outline">{action}</Badge>;
      }
    }

    if (entity_type === "PAYMENT") {
      switch (action) {
        case "UPDATE":
          return <Badge className="bg-blue-500">To&apos;landi</Badge>;
        default:
          return <Badge variant="outline">{action}</Badge>;
      }
    }

    if (entity_type === "USER") {
      switch (action) {
        case "LOGIN":
          return <Badge className="bg-green-500">Tizimga kirish</Badge>;
        case "LOGOUT":
          return <Badge className="bg-blue-500">Tizimdan chiqish</Badge>;
        default:
          return <Badge variant="outline">{action}</Badge>;
      }
    }

    if (entity_type === "SETTINGS") {
      switch (action) {
        case "UPDATE":
          return <Badge className="bg-blue-500">O&apos;zgartirildi</Badge>;
        default:
          return <Badge variant="outline">{action}</Badge>;
      }
    }

    return <Badge variant="outline">{action}</Badge>;
  };

  const getEntityTypeName = (type: string) => {
    switch (type) {
      case "DEBTOR":
        return "Qarzdor";
      case "DEBT":
        return "Qarz";
      case "PAYMENT":
        return "To'lov";
      case "USER":
        return "Foydalanuvchi";
      case "SETTINGS":
        return "Sozlamalar";
      default:
        return type;
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString("uz-UZ", {
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
