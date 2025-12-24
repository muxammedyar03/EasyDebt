import { Badge } from "@/components/ui/badge";
import { AuditLogTableProps, Debtor } from "@/types/types";

export function useTableUtils() {
  const getActionBadge = (action: string) => {
    switch (action) {
      case "CREATE":
        return <Badge className="bg-green-500">Yaratildi</Badge>;
      case "UPDATE":
        return <Badge className="bg-blue-500">Yangilandi</Badge>;
      case "DELETE":
        return <Badge variant="destructive">O&apos;chirildi</Badge>;
      case "LOGIN":
        return <Badge className="bg-purple-500">Kirish</Badge>;
      case "LOGOUT":
        return <Badge variant="secondary">Chiqish</Badge>;
      case "PAYMENT_ADDED":
        return <Badge className="bg-emerald-500">To&apos;lov</Badge>;
      case "DEBT_ADDED":
        return <Badge className="bg-orange-500">Qarz</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  const getEntityTypeName = (type: string) => {
    switch (type) {
      case "Debtor":
        return "Qarzdor";
      case "Debt":
        return "Qarz";
      case "Payment":
        return "To'lov";
      case "User":
        return "Foydalanuvchi";
      case "Settings":
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

  const getDebtorName = async (debtorId: number) => {
    const response = await fetch(`/api/debtors/${debtorId}`);
    const data = await response.json();
    const debtor = data as Debtor;
    return `${debtor.first_name} ${debtor.last_name}`;
  };

  const getActionDescription = async (log: AuditLogTableProps) => {
    try {
      const value: { debtor_id: number; amount: number } =
        typeof log.new_value === "string"
          ? JSON.parse(log.new_value)
          : (log.new_value as { debtor_id: number; amount: number });

      if (!value || typeof value !== "object") return null;

      if ((log.action === "DEBT_ADDED" || log.action === "PAYMENT_ADDED") && value.debtor_id && value.amount) {
        const formattedAmount = Number(value.amount).toLocaleString("uz-UZ");

        if (log.action === "DEBT_ADDED") {
          const debtorName = await getDebtorName(value.debtor_id);
          return `Qarzdor ${debtorName} uchun ${formattedAmount} so'm qarz qo'shildi.`;
        }

        if (log.action === "PAYMENT_ADDED") {
          const debtorName = await getDebtorName(value.debtor_id);
          return `Qarzdor ${debtorName} uchun ${formattedAmount} so'm to'lov qo'shildi.`;
        }
      }

      return null;
    } catch (e) {
      console.log(e);
      return null;
    }
  };

  return { getActionBadge, getEntityTypeName, formatDate, getActionDescription };
}

export type TableUtils = ReturnType<typeof useTableUtils>;
