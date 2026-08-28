"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AddDebtDialog } from "@/features/create-debt/ui";
import { AddPaymentDialog } from "@/features/make-payment/ui";
import { DebtHistoryTable } from "./debt-history-table";
import { PaymentHistoryTable } from "./payment-history-table";
import { DebtorHeader } from "./header";
import { ShareProfileDialog } from "./share-profile-dialog";
import { DebtorTimeline } from "./timeline";
import { StatsCards } from "./stats-cards";
import { PaymentReminderDialog } from "./payment-reminder-dialog";
import { ReminderStatusCard } from "./reminder-status-card";
import { usePaymentReminder } from "@/hooks/use-payment-reminder";
import { useDebtorDetail, DEBTOR_QUERY_KEY } from "@/features/view-debtor/hooks";
import type { ViewDebtorComputed } from "@/features/view-debtor/model";
import { DebtorDomain } from "@/types/domain";
import { APP_CONFIG } from "@/config/app-config";
import { useCurrentUser } from "@/hooks/use-current-user";
import { exportDebtorReceipt } from "@/lib/pdf";
import { useTranslations } from "next-intl";
import {
  SingleReceiptTemplate,
  TimelineReceiptTemplate,
  PrintConfirmDialog,
  printReceipt,
  type SingleReceiptData,
  type TimelineReceiptData,
} from "@/features/receipt-printer";
import { toast } from "sonner";

function DebtorDetailContent({
  initialDebtor,
  overdueDays,
  initialViewValue,
}: {
  initialDebtor: DebtorDomain;
  overdueDays: number;
  initialViewValue?: ViewDebtorComputed;
}) {
  const queryClient = useQueryClient();
  const tCommon = useTranslations("common");
  const tDebtor = useTranslations("debtor");
  const detail = useDebtorDetail({
    debtorId: initialDebtor.id,
    overdueDays,
    initialData: initialDebtor,
    initialViewValue,
  });

  const { debtor, refresh, stats, rating, timeline, firstDebtDate, daysSinceFirstDebt } = detail;
  const viewValue = {
    debtor: detail.debtor,
    stats,
    rating,
    timeline,
    firstDebtDate,
    daysSinceFirstDebt,
    refresh,
  };
  const [debtDialogOpen, setDebtDialogOpen] = React.useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = React.useState(false);
  const [reminderDialogOpen, setReminderDialogOpen] = React.useState(false);
  const [shareDialogOpen, setShareDialogOpen] = React.useState(false);
  const { user } = useCurrentUser();

  // ─── Receipt State ──────────────────────────────────────────
  const [printConfirmOpen, setPrintConfirmOpen] = React.useState(false);
  const [singleReceiptData, setSingleReceiptData] = React.useState<SingleReceiptData | null>(null);
  const [timelineReceiptData, setTimelineReceiptData] = React.useState<TimelineReceiptData | null>(null);
  const [pendingReceiptData, setPendingReceiptData] = React.useState<SingleReceiptData | null>(null);

  const reminder = usePaymentReminder({
    debtorId: debtor?.id ?? 0,
    enabled: !!debtor?.id,
  });

  const handleDialogSuccess = React.useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (receiptInfo?: any) => {
      if (debtor?.id) {
        queryClient.invalidateQueries({ queryKey: [DEBTOR_QUERY_KEY, debtor.id] });
      }

      // Agar receipt info mavjud bo'lsa va turi to'lov bo'lsa — chek dialog ko'rsat
      if (receiptInfo && receiptInfo.type === "PAYMENT") {
        const receiptData: SingleReceiptData = {
          type: receiptInfo.type,
          docNumber: receiptInfo.docNumber,
          date: new Date(),
          debtorName: receiptInfo.debtorName,
          debtorPhone: receiptInfo.debtorPhone,
          employeeName: receiptInfo.employeeName,
          amount: receiptInfo.amount,
          paymentType: receiptInfo.paymentType,
          description: receiptInfo.description,
          previousBalance: receiptInfo.previousBalance,
          newBalance: receiptInfo.newBalance,
        };
        setPendingReceiptData(receiptData);
        setPrintConfirmOpen(true);
      }
    },
    [queryClient, debtor?.id],
  );

  const handleReminderSuccess = React.useCallback(async () => {
    await reminder.refreshReminders();
  }, [reminder]);

  const handleExport = React.useCallback(async () => {
    if (!debtor) return;
    try {
      const timelineForExport = detail.timeline.map((event) => ({
        ...event,
        created_at: event.createdAt,
      }));
      await exportDebtorReceipt({
        appName: APP_CONFIG.name,
        logoUrl: "/favicon.ico",
        debtor: {
          id: debtor.id,
          first_name: debtor.firstName,
          last_name: debtor.lastName,
          phone_number: debtor.phoneNumber,
          address: debtor.address,
          total_debt: debtor.totalDebt,
          created_at: debtor.createdAt,
        },
        totals: detail.stats,
        rating: { label: detail.rating.label, score: detail.rating.score },
        timeline: timelineForExport,
        generatedBy: user
          ? { id: user.id, username: user.username, first_name: user.first_name, last_name: user.last_name }
          : null,
        generatedAt: new Date(),
      });
      toast.success(tDebtor("pdfSuccess"));
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error(tDebtor("pdfError"));
    }
  }, [debtor, detail.stats, detail.rating, detail.timeline, user, tDebtor]);

  // ─── Timeline Receipt Print Handler ─────────────────────────
  const handlePrintTimelineReceipt = React.useCallback(() => {
    if (!debtor) return;
    const employeeName = user
      ? (user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.username) || null
      : null;

    const data: TimelineReceiptData = {
      debtorName: `${debtor.firstName} ${debtor.lastName}`,
      debtorPhone: debtor.phoneNumber,
      debtorAddress: debtor.address,
      employeeName,
      timeline: detail.timeline.map((ev) => ({
        type: ev.type,
        amount: ev.amount,
        date: ev.createdAt,
        description: ev.subtitle,
      })),
      totalDebt: detail.stats.totalDebtAdded,
      totalPaid: detail.stats.totalPaid,
      remaining: detail.stats.remaining,
      generatedAt: new Date(),
    };

    setSingleReceiptData(null);
    setTimelineReceiptData(data);
    printReceipt(data);
  }, [debtor, detail.timeline, detail.stats, user]);

  // ─── Single Receipt Print (from history tables) ─────────────
  const handlePrintSingleReceipt = React.useCallback((receiptData: SingleReceiptData) => {
    setTimelineReceiptData(null);
    setSingleReceiptData(receiptData);
    printReceipt(receiptData);
  }, []);

  // ─── Print Confirm Handler (after debt/payment creation) ────
  const handlePrintConfirm = React.useCallback(() => {
    if (pendingReceiptData) {
      setTimelineReceiptData(null);
      setSingleReceiptData(pendingReceiptData);
      printReceipt(pendingReceiptData, () => {
        setPendingReceiptData(null);
      });
    }
  }, [pendingReceiptData]);

  if (!debtor) {
    return detail.isLoading ? (
      <div className="text-muted-foreground p-4">{tCommon("loading")}</div>
    ) : (
      <>{tDebtor("notFound")}</>
    );
  }

  const value = { ...viewValue, debtor };

  return (
    <div className="flex flex-col gap-6">
      <DebtorHeader
        value={value}
        onAddDebt={() => setDebtDialogOpen(true)}
        onAddPayment={() => setPaymentDialogOpen(true)}
        onExport={handleExport}
        onPrintReceipt={handlePrintTimelineReceipt}
        onShareProfile={() => setShareDialogOpen(true)}
      />
      <ReminderStatusCard
        activeReminder={reminder.activeReminder}
        isLoading={reminder.isLoading}
        onOpenDialog={() => setReminderDialogOpen(true)}
      />
      <StatsCards value={value} />
      <Tabs defaultValue="debts" className="w-full">
        <TabsList className="grid h-10 w-full grid-cols-3 md:w-1/2 lg:w-1/2">
          <TabsTrigger value="debts">
            {tDebtor("debts")}
            <Badge variant="secondary" className="border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-500">
              {debtor.debts?.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="payments">
            {tDebtor("payments")}
            <Badge
              variant="secondary"
              className="border-green-500/20 bg-green-500/10 text-green-700 dark:text-green-500"
            >
              {debtor.payments?.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="timeline">{tDebtor("timeline")}</TabsTrigger>
        </TabsList>
        <TabsContent value="debts" className="mt-4">
          {debtor.debts && (
            <DebtHistoryTable
              debts={debtor.debts}
              onRefresh={refresh}
              debtorName={`${debtor.firstName} ${debtor.lastName}`}
              debtorPhone={debtor.phoneNumber}
              totalDebt={debtor.totalDebt}
              onPrintReceipt={handlePrintSingleReceipt}
            />
          )}
        </TabsContent>
        <TabsContent value="payments" className="mt-4">
          {debtor.payments && (
            <PaymentHistoryTable
              payments={debtor.payments}
              onRefresh={refresh}
              debtorName={`${debtor.firstName} ${debtor.lastName}`}
              debtorPhone={debtor.phoneNumber}
              totalDebt={debtor.totalDebt}
              onPrintReceipt={handlePrintSingleReceipt}
            />
          )}
        </TabsContent>
        <TabsContent value="timeline" className="mt-4">
          <DebtorTimeline timeline={detail.timeline} />
        </TabsContent>
      </Tabs>

      <AddDebtDialog
        open={debtDialogOpen}
        onOpenChange={setDebtDialogOpen}
        debtorId={debtor.id}
        debtorName={`${debtor.firstName} ${debtor.lastName}`}
        onSuccess={handleDialogSuccess}
      />
      <AddPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        debtorId={debtor.id}
        debtorName={`${debtor.firstName} ${debtor.lastName}`}
        onSuccess={handleDialogSuccess}
      />
      <PaymentReminderDialog
        open={reminderDialogOpen}
        onOpenChange={setReminderDialogOpen}
        debtorId={debtor.id}
        debtorName={`${debtor.firstName} ${debtor.lastName}`}
        activeReminder={reminder.activeReminder}
        formState={reminder.formState}
        isLoading={reminder.isLoading}
        isSubmitting={reminder.isSubmitting}
        error={reminder.error}
        setFormDate={reminder.setFormDate}
        setFormTime={reminder.setFormTime}
        setFormNote={reminder.setFormNote}
        submitReminder={reminder.submitReminder}
        cancelReminder={reminder.cancelReminder}
        completeReminder={reminder.completeReminder}
        deleteReminder={reminder.deleteReminder}
        onSuccess={handleReminderSuccess}
      />

      {/* Print Confirm Dialog */}
      <PrintConfirmDialog
        open={printConfirmOpen}
        onOpenChange={setPrintConfirmOpen}
        onConfirm={handlePrintConfirm}
        receiptData={pendingReceiptData}
      />

      {/* Share Profile Dialog */}
      <ShareProfileDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        externalId={debtor.externalId}
        debtorName={`${debtor.firstName} ${debtor.lastName}`}
      />

      {/* Hidden Receipt Templates (faqat @media print da ko'rinadi) */}
      {singleReceiptData && <SingleReceiptTemplate data={singleReceiptData} />}
      {timelineReceiptData && <TimelineReceiptTemplate data={timelineReceiptData} />}
    </div>
  );
}

export function DebtorDetailClient({
  debtor: initialDebtor,
  overdueDays,
  initialViewValue,
}: {
  debtor: DebtorDomain;
  overdueDays: number;
  initialViewValue?: ViewDebtorComputed;
}) {
  return (
    <DebtorDetailContent initialDebtor={initialDebtor} overdueDays={overdueDays} initialViewValue={initialViewValue} />
  );
}
