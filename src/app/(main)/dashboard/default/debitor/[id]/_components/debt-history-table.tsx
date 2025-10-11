"use client";

import * as React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface DebtHistoryTableProps {
  debts: Array<{
    id: number;
    amount: number;
    description: string | null;
    created_at: Date;
  }>;
}

export function DebtHistoryTable({ debts }: DebtHistoryTableProps) {
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 10;

  const totalPages = Math.ceil(debts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentDebts = debts.slice(startIndex, endIndex);

  if (debts.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-muted-foreground text-center">Hozircha qarzlar yo&apos;q</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Qarzlar tarixi</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sana</TableHead>
              <TableHead>Miqdor</TableHead>
              <TableHead>Tavsif</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentDebts.map((debt) => (
              <TableRow key={debt.id}>
                <TableCell>
                  {new Date(debt.created_at).toLocaleDateString("uz-UZ", {
                    year: "numeric",
                    month: "numeric",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </TableCell>
                <TableCell>
                  <Badge variant="destructive">+{debt.amount.toLocaleString()} so&apos;m</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{debt.description || "—"}</TableCell>
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
