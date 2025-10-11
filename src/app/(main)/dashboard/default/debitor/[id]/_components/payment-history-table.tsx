"use client";

import * as React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PaymentHistoryTableProps {
  payments: Array<{
    id: number;
    amount: number;
    payment_type: string;
    note: string | null;
    created_at: Date;
  }>;
}

const paymentTypeLabels: Record<string, string> = {
  CASH: "Naqd",
  CLICK: "Click",
  CARD: "Karta",
};

export function PaymentHistoryTable({ payments }: PaymentHistoryTableProps) {
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 10;

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
    <Card>
      <CardHeader>
        <CardTitle>To&apos;lovlar tarixi</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sana</TableHead>
              <TableHead>Miqdor</TableHead>
              <TableHead>To&apos;lov turi</TableHead>
              <TableHead>Izoh</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentPayments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell>
                  {new Date(payment.created_at).toLocaleDateString("uz-UZ", {
                    year: "numeric",
                    month: "numeric",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </TableCell>
                <TableCell>
                  <Badge variant="default" className="bg-green-600">
                    -{payment.amount.toLocaleString()} so&apos;m
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{paymentTypeLabels[payment.payment_type] || payment.payment_type}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{payment.note || "—"}</TableCell>
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
  );
}
