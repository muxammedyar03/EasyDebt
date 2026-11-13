"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Trash2, FileText, ImageIcon, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrencyUzs, formatDateUz } from "@/lib/format";
import { getErrorMessage } from "@/lib/errors";

type ReceiptRow = {
  kind: "PAYMENT" | "DEBT";
  id: number;
  companyId: number;
  companyName: string;
  amount: number;
  note: string | null;
  paymentType: string | null;
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

async function fetchReceipts(page: number, fallbackError: string): Promise<ListResponse> {
  const res = await fetch(`/api/admin/company-receipts?page=${page}&limit=20`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || fallbackError);
  }
  return res.json();
}

export function CompanyReceiptsClient() {
  const t = useTranslations("companyTransactions");
  const queryClient = useQueryClient();
  const [page, setPage] = React.useState(1);
  const [previewKey, setPreviewKey] = React.useState<string | null>(null);
  const [deletingKey, setDeletingKey] = React.useState<string | null>(null);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["admin-company-receipts", page],
    queryFn: () => fetchReceipts(page, t("receiptLoadError")),
  });

  const handleDelete = async (row: ReceiptRow) => {
    if (!confirm(t("receiptDeleteConfirm"))) return;
    const key = `${row.kind}-${row.id}`;
    setDeletingKey(key);
    try {
      const res = await fetch(`/api/admin/company-receipts/${row.id}?kind=${row.kind}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || t("receiptDeleteError"));
      }
      toast.success(t("receiptDeleted"));
      await queryClient.invalidateQueries({ queryKey: ["admin-company-receipts"] });
    } catch (e) {
      toast.error(getErrorMessage(e, t("receiptDeleteError")));
    } finally {
      setDeletingKey(null);
    }
  };

  const rows = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;
  const previewRow = rows.find((row) => `${row.kind}-${row.id}` === previewKey) ?? null;
  const isImage = previewRow?.receiptMime?.startsWith("image/");
  const receiptUrl = (row: ReceiptRow) => `/api/admin/company-receipts/${row.id}?kind=${row.kind}`;
  const paymentTypeLabel = (type: string | null) => {
    if (type === "CASH") return t("cash");
    if (type === "CARD") return t("card");
    if (type === "CLICK") return t("click");
    return type ?? "—";
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight uppercase sm:text-2xl">{t("receiptsTitle")}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t("receiptsSubtitle")}</p>
        </div>
        <Button variant="outline" onClick={() => void refetch()} disabled={isFetching}>
          {isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          {t("refresh")}
        </Button>
      </div>

      <div className="text-muted-foreground flex flex-wrap gap-4 text-sm">
        <span>
          {t("total")}: <strong className="text-foreground">{data?.total ?? 0}</strong>
        </span>
        <span>
          {t("page")}: <strong className="text-foreground">{page}</strong> / {totalPages}
        </span>
      </div>

      <section className="bg-muted/30 min-h-[320px] rounded-xl border p-4">
        {isLoading ? (
          <div className="text-muted-foreground flex h-64 items-center justify-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("loading")}
          </div>
        ) : error ? (
          <div className="text-destructive flex h-64 items-center justify-center text-sm">{error.message}</div>
        ) : rows.length === 0 ? (
          <div className="text-muted-foreground flex h-64 items-center justify-center text-sm">{t("noReceipts")}</div>
        ) : (
          <div className="bg-background overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("date")}</TableHead>
                  <TableHead>{t("company")}</TableHead>
                  <TableHead>{t("amount")}</TableHead>
                  <TableHead>{t("type")}</TableHead>
                  <TableHead>{t("file")}</TableHead>
                  <TableHead className="text-right">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={`${row.kind}-${row.id}`}>
                    <TableCell>{formatDateUz(new Date(row.createdAt), true)}</TableCell>
                    <TableCell className="font-medium">{row.companyName}</TableCell>
                    <TableCell className="tabular-nums">{formatCurrencyUzs(row.amount)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {row.kind === "DEBT" ? t("debt") : `${t("payment")} · ${paymentTypeLabel(row.paymentType)}`}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {row.receiptMime?.startsWith("image/") ? (
                        <span className="inline-flex items-center gap-1">
                          <ImageIcon className="h-3.5 w-3.5" />
                          {t("image")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <FileText className="h-3.5 w-3.5" />
                          PDF
                        </span>
                      )}
                      {row.receiptSize != null && ` · ${Math.round(row.receiptSize / 1024)} KB`}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setPreviewKey(`${row.kind}-${row.id}`)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          disabled={deletingKey === `${row.kind}-${row.id}`}
                          onClick={() => void handleDelete(row)}
                        >
                          {deletingKey === `${row.kind}-${row.id}` ? (
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
              {t("previous")}
            </Button>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
              {t("next")}
            </Button>
          </div>
        )}
      </section>

      <Dialog open={previewRow != null} onOpenChange={(open) => !open && setPreviewKey(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {previewRow?.kind === "DEBT" ? t("debtDocument") : t("paymentReceipt")} #{previewRow?.id}
              {previewRow ? ` · ${previewRow.companyName}` : ""}
            </DialogTitle>
          </DialogHeader>
          {previewRow && (
            <div className="bg-muted/20 max-h-[70vh] overflow-auto rounded-lg border p-2">
              {isImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={receiptUrl(previewRow)}
                  alt={t("receiptPreview")}
                  className="mx-auto max-h-[65vh] w-auto object-contain"
                />
              ) : (
                <iframe title={t("receiptPreview")} src={receiptUrl(previewRow)} className="h-[65vh] w-full rounded" />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
