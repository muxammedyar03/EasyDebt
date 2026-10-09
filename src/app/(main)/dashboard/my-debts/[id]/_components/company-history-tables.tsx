"use client";

import * as React from "react";
import { Download, ExternalLink } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrencyUzs, formatDateUz } from "@/lib/format";
import { getPaymentTypeClass } from "@/lib/utils";
import {
  companyDebtReceiptUrl,
  companyPaymentReceiptUrl,
  getReceiptDisplayName,
} from "@/lib/companies/receipt-display";
import type { CompanyDomain } from "@/types/domain/company.domain";

type Props = {
  kind: "debts" | "payments";
  company: CompanyDomain;
};

export function CompanyHistoryTables({ kind, company }: Props) {
  const [page, setPage] = React.useState(1);
  const perPage = 10;

  if (kind === "debts") {
    const rows = company.debts ?? [];
    const totalPages = Math.max(1, Math.ceil(rows.length / perPage));
    const slice = rows.slice((page - 1) * perPage, page * perPage);

    return (
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Qarzlar tarixi</h2>
        {rows.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-8 text-center text-sm">
            Qarz yozuvlari yo&apos;q
          </p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sana</TableHead>
                    <TableHead>Summa</TableHead>
                    <TableHead>Izoh</TableHead>
                    <TableHead>Attachments</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slice.map((d) => {
                    const name = getReceiptDisplayName(d);
                    return (
                      <TableRow key={d.id}>
                        <TableCell>{formatDateUz(d.createdAt, true)}</TableCell>
                        <TableCell className="font-semibold text-red-600">{formatCurrencyUzs(d.amount)}</TableCell>
                        <TableCell className="max-w-[280px] truncate">{d.note || "—"}</TableCell>
                        <TableCell>
                          {d.receiptPath ? (
                            <div className="flex max-w-[240px] items-center gap-1">
                              <a
                                href={companyDebtReceiptUrl(d.id)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary min-w-0 flex-1 truncate text-sm font-medium hover:underline"
                                title={name}
                              >
                                {name}
                              </a>
                              <Button asChild variant="ghost" size="icon" className="size-8 shrink-0">
                                <a href={companyDebtReceiptUrl(d.id, true)} title="Yuklab olish">
                                  <Download className="size-3.5" />
                                </a>
                              </Button>
                            </div>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">
                  {page} / {totalPages}
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                    Oldingi
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Keyingi
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    );
  }

  const rows = company.payments ?? [];
  const totalPages = Math.max(1, Math.ceil(rows.length / perPage));
  const slice = rows.slice((page - 1) * perPage, page * perPage);

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold">To&apos;lovlar tarixi</h2>
      {rows.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-8 text-center text-sm">
          To&apos;lov yozuvlari yo&apos;q
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sana</TableHead>
                  <TableHead>Summa</TableHead>
                  <TableHead>Usul</TableHead>
                  <TableHead>Izoh</TableHead>
                  <TableHead>Attachments</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slice.map((p) => {
                  const hasReceipt = Boolean(p.receiptPath);
                  const name = getReceiptDisplayName({
                    ...p,
                    companyName: company.name,
                    paymentId: p.id,
                    createdAt: p.createdAt,
                  });
                  return (
                    <TableRow key={p.id}>
                      <TableCell>{formatDateUz(p.createdAt, true)}</TableCell>
                      <TableCell className="font-semibold text-emerald-600">{formatCurrencyUzs(p.amount)}</TableCell>
                      <TableCell>
                        <Badge className={getPaymentTypeClass(p.paymentType as "CASH" | "CLICK" | "CARD")}>
                          {p.paymentType}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate">{p.note || "—"}</TableCell>
                      <TableCell>
                        {hasReceipt ? (
                          <div className="flex max-w-[240px] items-center gap-1">
                            <a
                              href={companyPaymentReceiptUrl(p.id)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary min-w-0 flex-1 truncate text-sm font-medium hover:underline"
                              title={name}
                            >
                              {name}
                            </a>
                            <Button asChild variant="ghost" size="icon" className="size-8 shrink-0">
                              <a
                                href={companyPaymentReceiptUrl(p.id)}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Yangi tabda ochish"
                              >
                                <ExternalLink className="size-3.5" />
                              </a>
                            </Button>
                            <Button asChild variant="ghost" size="icon" className="size-8 shrink-0">
                              <a href={companyPaymentReceiptUrl(p.id, true)} title="Yuklab olish">
                                <Download className="size-3.5" />
                              </a>
                            </Button>
                          </div>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">
                {page} / {totalPages}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                  Oldingi
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Keyingi
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
