import { Badge } from "@/components/ui/badge";

export function useTableUtils() {
  const getActionBadge = (action: string, entity_type: string) => {
    if (action === "DEBT_ADDED") {
      return <Badge className="bg-blue-500">Qarz qo&apos;shildi</Badge>;
    }

    if (action === "PAYMENT_ADDED") {
      return <Badge className="bg-green-500">To&apos;lov qo&apos;shildi</Badge>;
    }

    if (action === "DEBT_UPDATED") {
      return <Badge className="bg-blue-500">Qarz yangilandi</Badge>;
    }

    if (action === "PAYMENT_UPDATED") {
      return <Badge className="bg-blue-500">To&apos;lov yangilandi</Badge>;
    }

    if (action === "IMPORT") {
      return <Badge className="bg-purple-500">Import qilindi</Badge>;
    }

    if (action === "EXPORT") {
      return <Badge className="bg-indigo-500">Export qilindi</Badge>;
    }

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

    if (entity_type === "DEBT") {
      switch (action) {
        case "CREATE":
          return <Badge className="bg-blue-500">Qarz qo&apos;shildi</Badge>;
        case "UPDATE":
          return <Badge className="bg-blue-500">Qarz yangilandi</Badge>;
        case "DELETE":
          return <Badge variant="destructive">Qarz o&apos;chirildi</Badge>;
        default:
          return <Badge variant="outline">{action}</Badge>;
      }
    }

    if (entity_type === "PAYMENT") {
      switch (action) {
        case "CREATE":
          return <Badge className="bg-green-500">To&apos;lov qo&apos;shildi</Badge>;
        case "UPDATE":
          return <Badge className="bg-blue-500">To&apos;lov yangilandi</Badge>;
        case "DELETE":
          return <Badge variant="destructive">To&apos;lov o&apos;chirildi</Badge>;
        default:
          return <Badge variant="outline">{action}</Badge>;
      }
    }

    if (entity_type === "COMPANY") {
      switch (action) {
        case "CREATE":
          return <Badge className="bg-green-500">Kompaniya yaratildi</Badge>;
        case "UPDATE":
          return <Badge className="bg-blue-500">Kompaniya yangilandi</Badge>;
        case "DELETE":
          return <Badge variant="destructive">Kompaniya o&apos;chirildi</Badge>;
        default:
          return <Badge variant="outline">{action}</Badge>;
      }
    }

    if (entity_type === "COMPANY_DEBT") {
      switch (action) {
        case "CREATE":
          return <Badge className="bg-blue-500">Kompaniya qarzi qo&apos;shildi</Badge>;
        case "UPDATE":
          return <Badge className="bg-blue-500">Kompaniya qarzi yangilandi</Badge>;
        case "DELETE":
          return <Badge variant="destructive">Kompaniya qarzi o&apos;chirildi</Badge>;
        default:
          return <Badge variant="outline">{action}</Badge>;
      }
    }

    if (entity_type === "COMPANY_PAYMENT") {
      switch (action) {
        case "CREATE":
          return <Badge className="bg-green-500">Kompaniya to&apos;lovi qo&apos;shildi</Badge>;
        case "UPDATE":
          return <Badge className="bg-blue-500">Kompaniya to&apos;lovi yangilandi</Badge>;
        case "DELETE":
          return <Badge variant="destructive">Kompaniya to&apos;lovi o&apos;chirildi</Badge>;
        default:
          return <Badge variant="outline">{action}</Badge>;
      }
    }

    if (entity_type === "COMPANY_PAYMENT_RECEIPT") {
      switch (action) {
        case "DELETE":
          return <Badge variant="destructive">To&apos;lov cheki o&apos;chirildi</Badge>;
        case "CREATE":
          return <Badge className="bg-green-500">To&apos;lov cheki qo&apos;shildi</Badge>;
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
        case "CREATE":
          return <Badge className="bg-green-500">Foydalanuvchi yaratildi</Badge>;
        case "UPDATE":
          return <Badge className="bg-blue-500">Foydalanuvchi yangilandi</Badge>;
        case "DELETE":
          return <Badge variant="destructive">Foydalanuvchi o&apos;chirildi</Badge>;
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

    if (entity_type === "PAYMENT_REMINDER") {
      return <Badge className="bg-amber-500">Eslatma</Badge>;
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
      case "PAYMENT_REMINDER":
        return "To'lov eslatmasi";
      case "COMPANY":
        return "Kompaniya";
      case "COMPANY_DEBT":
        return "Kompaniya qarzi";
      case "COMPANY_PAYMENT":
        return "Kompaniya to'lovi";
      case "COMPANY_PAYMENT_RECEIPT":
        return "To'lov cheki";
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
