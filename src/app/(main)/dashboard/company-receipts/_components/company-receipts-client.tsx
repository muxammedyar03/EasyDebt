"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Trash2, FileText, ImageIcon, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrencyUzs, formatDateUz } from "@/lib/format";
import { getErrorMessage } from "@/lib/errors";

type ReceiptRow = {
  id: number;
  companyId: number;
  companyName: string;
  amount: number;
  note: string | null;
  paymentType: string;
  receiptPath: string | null;
  receiptMime: string | null;
  receiptSize: number | null;
  createdAt: string | Date;
};

type ListResponse = {
  data: ReceiptRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

async function fetchReceipts(page: number): Promise<ListResponse> {
  const res = await fetch(`/api/admin/company-receipts?page=${page}&limit=20`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || "Cheklarni yuklashda xatolik");
  }
  return res.json();
}

export function CompanyReceiptsClient() {
  const queryClient = useQueryClient();
  const [page, setPage] = React.useState(1);
  const [previewId, setPreviewId] = React.useState<number | null>(null);
  const [deletingId, setDeletingId] = React.useState<number | null>(null);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["admin-company-receipts", page],
    queryFn: () => fetchReceipts(page),
  });

  const handleDelete = async (id: number) => {
    if (!confirm("Bu chek o'chirilsinmi? Fayl diskdan ham o'chiriladi.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/company-receipts/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || "O'chirishda xatolik");
      }
      toast.success("Chek o'chirildi");
      await queryClient.invalidateQueries({ queryKey: ["admin-company-receipts"] });
    } catch (e) {
      toast.error(getErrorMessage(e, "O'chirishda xatolik"));
    } finally {
      setDeletingId(null);
    }
  };

  const rows = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;
  const previewRow = rows.find((r) => r.id === previewId) ?? null;
  const isImage = previewRow?.receiptMime?.startsWith("image/");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight uppercase sm:text-3xl">To&apos;lov cheklari</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            SUPER_ADMIN: kompaniya to&apos;lovlariga biriktirilgan chek/rasmlarni ko&apos;rish va o&apos;chirish
          </p>
        </div>
        <Button variant="outline" onClick={() => void refetch()} disabled={isFetching}>
          {isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Yangilash
        </Button>
      </div>

      <div className="text-muted-foreground flex flex-wrap gap-4 text-sm">
        <span>
          Jami: <strong className="text-foreground">{data?.total ?? 0}</strong>
        </span>
        <span>
          Sahifa: <strong className="text-foreground">{page}</strong> / {totalPages}
        </span>
      </div>

      <section className="bg-muted/30 min-h-[320px] rounded-xl border p-4">
        {isLoading ? (
          <div className="text-muted-foreground flex h-64 items-center justify-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Yuklanmoqda...
          </div>
        ) : error ? (
          <div className="text-destructive flex h-64 items-center justify-center text-sm">{error.message}</div>
        ) : rows.length === 0 ? (
          <div className="text-muted-foreground flex h-64 items-center justify-center text-sm">No records found</div>
        ) : (
          <div className="bg-background overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sana</TableHead>
                  <TableHead>Kompaniya</TableHead>
                  <TableHead>Summa</TableHead>
                  <TableHead>Usul</TableHead>
                  <TableHead>Fayl</TableHead>
                  <TableHead className="text-right">Amallar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{formatDateUz(new Date(row.createdAt), true)}</TableCell>
                    <TableCell className="font-medium">{row.companyName}</TableCell>
                    <TableCell className="tabular-nums">{formatCurrencyUzs(row.amount)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{row.paymentType}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {row.receiptMime?.startsWith("image/") ? (
                        <span className="inline-flex items-center gap-1">
                          <ImageIcon className="h-3.5 w-3.5" />
                          rasm
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <FileText className="h-3.5 w-3.5" />
                          pdf
                        </span>
                      )}
                      {row.receiptSize != null && ` · ${Math.round(row.receiptSize / 1024)} KB`}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setPreviewId(row.id)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          disabled={deletingId === row.id}
                          onClick={() => void handleDelete(row.id)}
                        >
                          {deletingId === row.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              Oldingi
            </Button>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
              Keyingi
            </Button>
          </div>
        )}
      </section>

      <Dialog open={previewId != null} onOpenChange={(open) => !open && setPreviewId(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Chek #{previewId}
              {previewRow ? ` · ${previewRow.companyName}` : ""}
            </DialogTitle>
          </DialogHeader>
          {previewId != null && (
            <div className="bg-muted/20 max-h-[70vh] overflow-auto rounded-lg border p-2">
              {isImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/admin/company-receipts/${previewId}`}
                  alt="Chek"
                  className="mx-auto max-h-[65vh] w-auto object-contain"
                />
              ) : (
                <iframe
                  title="Chek PDF"
                  src={`/api/admin/company-receipts/${previewId}`}
                  className="h-[65vh] w-full rounded"
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
