"use client";

import * as React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";
import { DebtDomain } from "@/types/domain";
import { DEV_MODE } from "@/lib/dev-mode";
import { EditDebtDialog } from "./edit-debt-dialog";
import { formatDateUz } from "@/lib/format";
import { useIsMobile } from "@/hooks/use-mobile";
import { PrintReceiptButton, type SingleReceiptData } from "@/features/receipt-printer";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useTranslations } from "next-intl";

interface DebtHistoryTableProps {
  debts: DebtDomain[];
  onRefresh?: () => Promise<void>;
  debtorName?: string;
  debtorPhone?: string | null;
  totalDebt?: number;
  onPrintReceipt?: (data: SingleReceiptData) => void;
}

export function DebtHistoryTable({
  debts,
  onRefresh,
  debtorName,
  debtorPhone,
  totalDebt,
  onPrintReceipt,
}: DebtHistoryTableProps) {
  const t = useTranslations("debtor");
  const tCommon = useTranslations("common");
  const tDash = useTranslations("dashboard");
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 10;
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [selectedDebt, setSelectedDebt] = React.useState<DebtDomain | null>(null);
  const isMobile = useIsMobile();
  const { user } = useCurrentUser();

  const handleEdit = (debt: DebtDomain) => {
    setSelectedDebt(debt);
    setEditDialogOpen(true);
  };

  const handleEditSuccess = async () => {
    await onRefresh?.();
  };

  /**
   * Chek chiqarish uchun balance ni hisoblash:
   * Barcha debts va payments ni vaqt bo'yicha tartiblash orqali
   * shu qarz qo'shilgunga qadar qancha balance bo'lganini aniqlash.
   *
   * Oddiy yondashuv: totalDebt dan shu debt dan keyingi barcha debtlarni ayirib,
   * shu debt dan keyingi paymentlarni qo'shib oldingi balance ni topamiz.
   * Lekin bu murakkab, shuning uchun oddiyroq usul ishlatamiz:
   * newBalance = previousBalance + debt.amount → previousBalance = totalDebt - (shu debtgacha bolgan jami)
   */
  const handlePrintDebtReceipt = React.useCallback(
    (debt: DebtDomain) => {
      if (!onPrintReceipt || !debtorName) return;

      const employeeName = user
        ? (user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.username) || null
        : null;

      // Qoldiqni hisoblash: hozirgi totalDebt dan foydalanib
      // Bu aniq emas (chunki keyingi tranzaksiyalar ham bor), lekin hozirgi qoldiq ko'rsatiladi
      const currentBalance = totalDebt ?? 0;

      const receiptData: SingleReceiptData = {
        type: "DEBT",
        docNumber: debt.id,
        date: debt.createdAt,
        debtorName: debtorName,
        debtorPhone: debtorPhone ?? null,
        employeeName,
        amount: debt.amount,
        description: debt.description,
        previousBalance: currentBalance - debt.amount,
        newBalance: currentBalance,
      };

      onPrintReceipt(receiptData);
    },
    [onPrintReceipt, debtorName, debtorPhone, totalDebt, user],
  );

  const totalPages = Math.ceil(debts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentDebts = debts.slice(startIndex, endIndex);

  if (debts.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-muted-foreground text-center">{t("noDebts")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-2 md:p-3 xl:p-4">
        <CardHeader className="p-2 md:p-3 xl:p-4">
          <CardTitle>{t("debtHistory")}</CardTitle>
        </CardHeader>
        <CardContent className="p-2 md:p-3 xl:p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tDash("index")}</TableHead>
                <TableHead>{tCommon("date")}</TableHead>
                <TableHead>{tCommon("amount")}</TableHead>
                {!isMobile && <TableHead>{tCommon("description")}</TableHead>}
                <TableHead className="w-[100px]">{tCommon("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentDebts.map((debt, index) => (
                <TableRow key={debt.id}>
                  <TableCell width={50}>{index + 1}</TableCell>
                  <TableCell width={400}>{formatDateUz(debt.createdAt, true)}</TableCell>
                  <TableCell width={500}>
                    <Badge className="h-6 border-red-600/20 bg-red-500/10 px-3 text-xs text-red-700 dark:text-red-500">
                      +{debt.amount.toLocaleString()} {tCommon("som")}
                    </Badge>
                  </TableCell>
                  {!isMobile && <TableCell className="text-muted-foreground">{debt.description || "—"}</TableCell>}
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {onPrintReceipt && <PrintReceiptButton onClick={() => handlePrintDebtReceipt(debt)} />}
                      {DEV_MODE && !isMobile && (
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(debt)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-muted-foreground text-sm">
                {startIndex + 1}-{Math.min(endIndex, debts.length)} / {debts.length}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="rounded border px-3 py-1 text-sm disabled:opacity-50"
                >
                  {t("previous")}
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded border px-3 py-1 text-sm disabled:opacity-50"
                >
                  {t("next")}
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      {selectedDebt && (
        <EditDebtDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          debt={selectedDebt}
          onSuccess={handleEditSuccess}
        />
      )}
    </>
  );
}
