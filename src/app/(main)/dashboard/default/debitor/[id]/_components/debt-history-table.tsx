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
import { useDebtor } from "./context/debtor-context";
import { formatDateUz } from "@/lib/format";
import { useIsMobile } from "@/hooks/use-mobile";

interface DebtHistoryTableProps {
  debts: DebtDomain[];
}

export function DebtHistoryTable({ debts }: DebtHistoryTableProps) {
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 10;
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [selectedDebt, setSelectedDebt] = React.useState<DebtDomain | null>(null);
  const { refresh } = useDebtor();
  const isMobile = useIsMobile();

  const handleEdit = (debt: DebtDomain) => {
    setSelectedDebt(debt);
    setEditDialogOpen(true);
  };

  const handleEditSuccess = async () => {
    await refresh();
  };

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
    <>
      <Card className="p-2 md:p-3 xl:p-4">
        <CardHeader className="p-2 md:p-3 xl:p-4">
          <CardTitle>Qarzlar tarixi</CardTitle>
        </CardHeader>
        <CardContent className="p-2 md:p-3 xl:p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>№</TableHead>
                <TableHead>Sana</TableHead>
                <TableHead>Miqdor</TableHead>
                {!isMobile && <TableHead>Tavsif</TableHead>}
                {DEV_MODE && !isMobile && <TableHead className="w-[100px]">Amallar</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentDebts.map((debt, index) => (
                <TableRow key={debt.id}>
                  <TableCell width={50}>{index + 1}</TableCell>
                  <TableCell width={400}>{formatDateUz(debt.createdAt, true)}</TableCell>
                  <TableCell width={500}>
                    <Badge className="h-6 border-red-600/20 bg-red-500/10 px-3 text-xs text-red-700 dark:text-red-500">
                      +{debt.amount.toLocaleString()} so&apos;m
                    </Badge>
                  </TableCell>
                  {!isMobile && <TableCell className="text-muted-foreground">{debt.description || "—"}</TableCell>}
                  {DEV_MODE && !isMobile && (
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(debt)}>
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
