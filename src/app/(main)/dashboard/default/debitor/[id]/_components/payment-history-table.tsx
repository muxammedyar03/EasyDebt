"use client";

import * as React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";
import { PaymentDomain } from "@/types/domain";
import { getPaymentTypeClass } from "@/lib/utils";
import { DEV_MODE } from "@/lib/dev-mode";
import { EditPaymentDialog } from "./edit-payment-dialog";
import { formatDateUz } from "@/lib/format";
import { useIsMobile } from "@/hooks/use-mobile";
import { PrintReceiptButton, type SingleReceiptData } from "@/features/receipt-printer";
import { useCurrentUser } from "@/hooks/use-current-user";

interface PaymentHistoryTableProps {
  payments: PaymentDomain[];
  onRefresh?: () => Promise<void>;
  debtorName?: string;
  debtorPhone?: string | null;
  totalDebt?: number;
  onPrintReceipt?: (data: SingleReceiptData) => void;
}

export function PaymentHistoryTable({
  payments,
  onRefresh,
  debtorName,
  debtorPhone,
  totalDebt,
  onPrintReceipt,
}: PaymentHistoryTableProps) {
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 10;
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [selectedPayment, setSelectedPayment] = React.useState<PaymentDomain | null>(null);
  const isMobile = useIsMobile();
  const { user } = useCurrentUser();

  const handleEdit = (payment: PaymentDomain) => {
    setSelectedPayment(payment);
    setEditDialogOpen(true);
  };

  const handleEditSuccess = async () => {
    await onRefresh?.();
  };

  const handlePrintPaymentReceipt = React.useCallback(
    (payment: PaymentDomain) => {
      if (!onPrintReceipt || !debtorName) return;

      const employeeName = user
        ? (user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.username) || null
        : null;

      const currentBalance = totalDebt ?? 0;

      const receiptData: SingleReceiptData = {
        type: "PAYMENT",
        docNumber: payment.id,
        date: payment.createdAt,
        debtorName: debtorName,
        debtorPhone: debtorPhone ?? null,
        employeeName,
        amount: payment.amount,
        paymentType: payment.paymentType,
        description: payment.note,
        previousBalance: currentBalance + payment.amount,
        newBalance: currentBalance,
      };

      onPrintReceipt(receiptData);
    },
    [onPrintReceipt, debtorName, debtorPhone, totalDebt, user],
  );

  const totalPages = Math.ceil(payments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPayments = payments.slice(startIndex, endIndex);

  if (payments.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-muted-foreground text-center">Hozircha to&apos;lovlar yo&apos;q</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>История платежей</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>№</TableHead>
                <TableHead>Дата</TableHead>
                <TableHead>Сумма</TableHead>
                {!isMobile && <TableHead>Тип платежа</TableHead>}
                {!isMobile && <TableHead>Описание</TableHead>}
                <TableHead className="w-[100px]">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentPayments.map((payment, index: number) => (
                <TableRow key={payment.id}>
                  <TableCell width={isMobile ? 20 : 50}>{index + 1}</TableCell>
                  <TableCell width={!isMobile ? 300 : undefined}>
                    {payment?.createdAt ? formatDateUz(payment.createdAt, !isMobile) : "--/--/----"}
                    <p className="text-muted-foreground text-xs md:hidden">{"описание: " + (payment.note || "--")}</p>
                  </TableCell>
                  <TableCell width={!isMobile ? 300 : undefined} className="flex flex-col items-end">
                    <p className="font-bold text-green-600">-{payment.amount.toLocaleString()} сум</p>
                    <Badge
                      variant="default"
                      className={`h-6 px-3 text-xs md:hidden ${getPaymentTypeClass(payment.paymentType)}`}
                    >
                      {payment.paymentType == "CASH" ? "Наличные" : payment.paymentType == "CLICK" ? "Карта" : "Карта"}
                    </Badge>
                  </TableCell>
                  {!isMobile && (
                    <TableCell width={300}>
                      <Badge
                        variant="default"
                        className={`h-6 px-3 text-xs ${getPaymentTypeClass(payment.paymentType)}`}
                      >
                        {payment.paymentType == "CASH"
                          ? "Наличные"
                          : payment.paymentType == "CLICK"
                            ? "Карта"
                            : "Карта"}
                      </Badge>
                    </TableCell>
                  )}
                  {!isMobile && <TableCell className="text-muted-foreground">{payment.note || "—"}</TableCell>}
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {onPrintReceipt && <PrintReceiptButton onClick={() => handlePrintPaymentReceipt(payment)} />}
                      {DEV_MODE && !isMobile && (
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(payment)}>
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
                {startIndex + 1}-{Math.min(endIndex, payments.length)} / {payments.length}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="rounded border px-3 py-1 text-sm disabled:opacity-50"
                >
                  Предыдущая
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded border px-3 py-1 text-sm disabled:opacity-50"
                >
                  Следующая
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      {selectedPayment && (
        <EditPaymentDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          payment={selectedPayment}
          onSuccess={handleEditSuccess}
        />
      )}
    </>
  );
}
