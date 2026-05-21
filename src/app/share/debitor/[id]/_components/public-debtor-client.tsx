"use client";

import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ViewStatsCards } from "@/features/view-debtor/ui/stats-cards";
import { ViewDebtorTimeline } from "@/features/view-debtor/ui/debtor-timeline";
import { Phone, MapPin, Calendar, Landmark, CheckCircle2, AlertCircle } from "lucide-react";
import { formatCurrencyUzs, formatDateUz } from "@/lib/format";
import { getPaymentTypeClass } from "@/lib/utils";
import type { ViewDebtorComputed } from "@/features/view-debtor/model";
import type { DebtorDomain } from "@/types/domain";

interface PublicDebtorClientProps {
  debtor: DebtorDomain;
  overdueDays: number;
  initialViewValue: ViewDebtorComputed;
}

export function PublicDebtorClient({ debtor, overdueDays, initialViewValue }: PublicDebtorClientProps) {
  const { stats, rating, timeline, firstDebtDate, daysSinceFirstDebt } = initialViewValue;

  const viewValue = {
    debtor,
    stats,
    rating,
    timeline,
    firstDebtDate,
    daysSinceFirstDebt,
    refresh: async () => {},
  };

  const [debtPage, setDebtPage] = React.useState(1);
  const [paymentPage, setPaymentPage] = React.useState(1);
  const itemsPerPage = 10;

  const paginatedDebts = React.useMemo(() => {
    const debts = debtor.debts ?? [];
    const startIndex = (debtPage - 1) * itemsPerPage;
    return debts.slice(startIndex, startIndex + itemsPerPage);
  }, [debtor.debts, debtPage]);

  const paginatedPayments = React.useMemo(() => {
    const payments = debtor.payments ?? [];
    const startIndex = (paymentPage - 1) * itemsPerPage;
    return payments.slice(startIndex, startIndex + itemsPerPage);
  }, [debtor.payments, paymentPage]);

  const totalDebtPages = Math.ceil((debtor.debts?.length ?? 0) / itemsPerPage);
  const totalPaymentPages = Math.ceil((debtor.payments?.length ?? 0) / itemsPerPage);

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8 dark:bg-slate-950/20">
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Brand Header */}
        <div className="flex flex-col items-center justify-between gap-4 border-b border-slate-200/60 pb-6 md:flex-row md:items-start dark:border-slate-800/60">
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center gap-2 md:justify-start">
              <Landmark className="text-primary h-6 w-6 animate-pulse" />
              <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Easy Debt</span>
            </div>
            <p className="text-muted-foreground mt-1 text-sm">Mijozlar qarzlari va to&apos;lovlari monitoringi</p>
          </div>

          <div className="flex items-center gap-2">
            {debtor.isOverdue ? (
              <Badge
                variant="destructive"
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold tracking-wider uppercase"
              >
                <AlertCircle className="h-3.5 w-3.5" />
                Muddati o&apos;tgan
              </Badge>
            ) : (
              <Badge
                variant="default"
                className="flex items-center gap-1.5 bg-emerald-500 px-3 py-1 text-xs font-semibold tracking-wider text-white uppercase hover:bg-emerald-600"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Faol / Vaqtida
              </Badge>
            )}
          </div>
        </div>

        {/* Debtor Profile Information Card */}
        <Card className="overflow-hidden border-none bg-gradient-to-br from-white to-slate-50 shadow-md dark:from-slate-900 dark:to-slate-900/60">
          <div className="bg-primary/5 h-2 w-full" />
          <CardContent className="p-6 md:p-8">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <h2 className="text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white">
                    {debtor.firstName} {debtor.lastName}
                  </h2>
                  <p className="text-muted-foreground mt-1 text-sm font-medium">Mijoz sahifasi (Ochiq profil)</p>
                </div>

                <div className="space-y-2.5 pt-2">
                  <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                    <Phone className="text-primary/70 h-4.5 w-4.5" />
                    <span className="text-sm font-medium">{debtor.phoneNumber || "Telefon raqami yo'q"}</span>
                  </div>

                  <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                    <MapPin className="text-primary/70 h-4.5 w-4.5" />
                    <span className="text-sm font-medium">{debtor.address || "Manzil kiritilmagan"}</span>
                  </div>

                  <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                    <Calendar className="text-primary/70 h-4.5 w-4.5" />
                    <span className="text-sm font-medium">
                      Ro&apos;yxatga olingan sana: {formatDateUz(new Date(debtor.createdAt))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Box */}
              <div className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-white/60 p-6 shadow-sm md:ml-auto md:w-80 dark:border-slate-800 dark:bg-slate-800/40">
                <div className="space-y-1">
                  <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Joriy holat</span>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">
                    {formatCurrencyUzs(stats.remaining)}
                  </div>
                  <p className="text-muted-foreground text-xs font-medium">
                    to&apos;lanishi lozim bo&apos;lgan joriy qoldiq
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
                  <span className="text-muted-foreground text-xs">Mijoz reytingi:</span>
                  <span className={`text-sm font-bold ${rating.color}`}>{rating.label}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards Row */}
        <ViewStatsCards value={viewValue} />

        {/* Main Tabs Content */}
        <Tabs defaultValue="debts" className="w-full space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-slate-100/80 p-1 md:w-[400px] dark:bg-slate-800/60">
            <TabsTrigger value="debts" className="rounded-md">
              Qarzlar
              <Badge variant="secondary" className="ml-1.5 border-none bg-red-500/10 text-red-600">
                {debtor.debts?.length ?? 0}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="payments" className="rounded-md">
              To&apos;lovlar
              <Badge variant="secondary" className="ml-1.5 border-none bg-green-500/10 text-green-600">
                {debtor.payments?.length ?? 0}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="timeline" className="rounded-md">
              Tarix
            </TabsTrigger>
          </TabsList>

          {/* Debts Tab */}
          <TabsContent value="debts" className="space-y-4">
            <Card className="border-none shadow-sm">
              <CardHeader className="border-b border-slate-100 pb-4 dark:border-slate-800">
                <CardTitle className="text-lg font-bold">Olingan qarzlar ro&apos;yxati</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {paginatedDebts.length === 0 ? (
                  <div className="text-muted-foreground py-12 text-center font-medium">
                    Hozircha olingan qarzlar mavjud emas
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 dark:bg-slate-900/30">
                          <TableHead className="w-[180px]">Sana</TableHead>
                          <TableHead className="text-right">Miqdor</TableHead>
                          <TableHead>Tavsif</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedDebts.map((debt) => (
                          <TableRow key={debt.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-900/10">
                            <TableCell className="font-medium text-slate-600 dark:text-slate-400">
                              {formatDateUz(debt.createdAt, true)}
                            </TableCell>
                            <TableCell className="text-right font-bold text-red-600">
                              {formatCurrencyUzs(debt.amount)}
                            </TableCell>
                            <TableCell className="max-w-[300px] truncate font-medium text-slate-700 dark:text-slate-300">
                              {debt.description || "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Pagination Controls */}
                {totalDebtPages > 1 && (
                  <div className="flex items-center justify-end gap-2 border-t border-slate-100 p-4 dark:border-slate-800">
                    <button
                      className="border-input bg-background hover:bg-accent inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm font-medium disabled:opacity-50"
                      onClick={() => setDebtPage((p) => Math.max(1, p - 1))}
                      disabled={debtPage === 1}
                    >
                      Oldingi
                    </button>
                    <span className="text-sm font-medium text-slate-500">
                      Sahifa {debtPage} / {totalDebtPages}
                    </span>
                    <button
                      className="border-input bg-background hover:bg-accent inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm font-medium disabled:opacity-50"
                      onClick={() => setDebtPage((p) => Math.min(totalDebtPages, p + 1))}
                      disabled={debtPage === totalDebtPages}
                    >
                      Keyingi
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-4">
            <Card className="border-none shadow-sm">
              <CardHeader className="border-b border-slate-100 pb-4 dark:border-slate-800">
                <CardTitle className="text-lg font-bold">Kiritilgan to&apos;lovlar ro&apos;yxati</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {paginatedPayments.length === 0 ? (
                  <div className="text-muted-foreground py-12 text-center font-medium">
                    Hozircha to&apos;lovlar amalga oshirilmagan
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 dark:bg-slate-900/30">
                          <TableHead className="w-[180px]">Sana</TableHead>
                          <TableHead className="text-right">Miqdor</TableHead>
                          <TableHead className="w-[120px]">Usuli</TableHead>
                          <TableHead>Izoh</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedPayments.map((payment) => {
                          const paymentTypeLabel =
                            payment.paymentType === "CASH"
                              ? "Naqd"
                              : payment.paymentType === "CLICK"
                                ? "Click"
                                : "Karta";
                          return (
                            <TableRow key={payment.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-900/10">
                              <TableCell className="font-medium text-slate-600 dark:text-slate-400">
                                {formatDateUz(payment.createdAt, true)}
                              </TableCell>
                              <TableCell className="text-right font-bold text-green-600">
                                {formatCurrencyUzs(payment.amount)}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="default"
                                  className={`px-2.5 py-0.5 text-xs font-semibold ${getPaymentTypeClass(paymentTypeLabel)}`}
                                >
                                  {paymentTypeLabel}
                                </Badge>
                              </TableCell>
                              <TableCell className="max-w-[300px] truncate font-medium text-slate-700 dark:text-slate-300">
                                {payment.note || "—"}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Pagination Controls */}
                {totalPaymentPages > 1 && (
                  <div className="flex items-center justify-end gap-2 border-t border-slate-100 p-4 dark:border-slate-800">
                    <button
                      className="border-input bg-background hover:bg-accent inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm font-medium disabled:opacity-50"
                      onClick={() => setPaymentPage((p) => Math.max(1, p - 1))}
                      disabled={paymentPage === 1}
                    >
                      Oldingi
                    </button>
                    <span className="text-sm font-medium text-slate-500">
                      Sahifa {paymentPage} / {totalPaymentPages}
                    </span>
                    <button
                      className="border-input bg-background hover:bg-accent inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm font-medium disabled:opacity-50"
                      onClick={() => setPaymentPage((p) => Math.min(totalPaymentPages, p + 1))}
                      disabled={paymentPage === totalPaymentPages}
                    >
                      Keyingi
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline">
            <ViewDebtorTimeline timeline={timeline} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
