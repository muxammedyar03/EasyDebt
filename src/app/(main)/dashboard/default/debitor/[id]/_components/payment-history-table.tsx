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

interface PaymentHistoryTableProps {
  payments: PaymentDomain[];
  onRefresh?: () => Promise<void>;
}

export function PaymentHistoryTable({ payments, onRefresh }: PaymentHistoryTableProps) {
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 10;
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [selectedPayment, setSelectedPayment] = React.useState<PaymentDomain | null>(null);
  const isMobile = useIsMobile();

  const handleEdit = (payment: PaymentDomain) => {
    setSelectedPayment(payment);
    setEditDialogOpen(true);
  };

  const handleEditSuccess = async () => {
    await onRefresh?.();
  };

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
          <CardTitle>To&apos;lovlar tarixi</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>№</TableHead>
                <TableHead>Sana</TableHead>
                <TableHead>Miqdor</TableHead>
                {!isMobile && <TableHead>To&apos;lov turi</TableHead>}
                {!isMobile && <TableHead>Izoh</TableHead>}
                {DEV_MODE && !isMobile && <TableHead className="w-[100px]">Amallar</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentPayments.map((payment, index: number) => (
                <TableRow key={payment.id}>
                  <TableCell width={isMobile ? 20 : 50}>{index + 1}</TableCell>
                  <TableCell width={!isMobile ? 300 : undefined}>
                    {payment?.createdAt ? formatDateUz(payment.createdAt, !isMobile) : "--/--/----"}
                    <p className="text-muted-foreground text-xs md:hidden">{"izoh: " + (payment.note || "--")}</p>
                  </TableCell>
                  <TableCell width={!isMobile ? 300 : undefined} className="flex flex-col items-end">
                    <p className="font-bold text-green-600">-{payment.amount.toLocaleString()} so&apos;m</p>
                    <Badge
                      variant="default"
                      className={`h-6 px-3 text-xs md:hidden ${getPaymentTypeClass(payment.paymentType)}`}
                    >
                      {payment.paymentType == "CASH" ? "Naqd" : payment.paymentType == "CLICK" ? "Click" : "Karta"}
                    </Badge>
                  </TableCell>
                  {!isMobile && (
                    <TableCell width={300}>
                      <Badge
                        variant="default"
                        className={`h-6 px-3 text-xs ${getPaymentTypeClass(payment.paymentType)}`}
                      >
                        {payment.paymentType == "CASH" ? "Naqd" : payment.paymentType == "CLICK" ? "Click" : "Karta"}
                      </Badge>
                    </TableCell>
                  )}
                  {!isMobile && <TableCell className="text-muted-foreground">{payment.note || "—"}</TableCell>}
                  {DEV_MODE && !isMobile && (
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(payment)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
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
                  Oldingi
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded border px-3 py-1 text-sm disabled:opacity-50"
                >
                  Keyingi
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
