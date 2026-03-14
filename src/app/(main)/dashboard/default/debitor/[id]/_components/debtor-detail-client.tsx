"use client";

import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AddDebtDialog } from "@/features/create-debt/ui";
import { AddPaymentDialog } from "@/features/make-payment/ui";
import { DebtHistoryTable } from "./debt-history-table";
import { PaymentHistoryTable } from "./payment-history-table";
import { DebtorHeader } from "./header";
import { DebtorTimeline } from "./timeline";
import { StatsCards } from "./stats-cards";
import { PaymentReminderDialog } from "./payment-reminder-dialog";
import { ReminderStatusCard } from "./reminder-status-card";
import { usePaymentReminder } from "@/hooks/use-payment-reminder";
import { useDebtorDetail } from "@/features/view-debtor/hooks";
import { DebtorDomain } from "@/types/domain";
import { APP_CONFIG } from "@/config/app-config";
import { useCurrentUser } from "@/hooks/use-current-user";
import { exportDebtorReceipt } from "@/lib/pdf";

function DebtorDetailContent({ initialDebtor, overdueDays }: { initialDebtor: DebtorDomain; overdueDays: number }) {
  const detail = useDebtorDetail({
    debtorId: initialDebtor.id,
    overdueDays,
    initialData: initialDebtor,
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
  const { user } = useCurrentUser();

  const reminder = usePaymentReminder({
    debtorId: debtor?.id ?? 0,
    enabled: !!debtor?.id,
  });

  const handleDialogSuccess = React.useCallback(async () => {
    await refresh();
  }, [refresh]);

  const handleReminderSuccess = React.useCallback(async () => {
    await reminder.refreshReminders();
  }, [reminder]);

  const handleExport = React.useCallback(async () => {
    if (!debtor) return;
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
  }, [debtor, detail.stats, detail.rating, detail.timeline, user]);

  if (!debtor) {
    return detail.isLoading ? <div className="text-muted-foreground p-4">Yuklanmoqda...</div> : <>Qarzdor topilmadi</>;
  }

  const value = { ...viewValue, debtor };

  return (
    <div className="flex flex-col gap-6">
      <DebtorHeader
        value={value}
        onAddDebt={() => setDebtDialogOpen(true)}
        onAddPayment={() => setPaymentDialogOpen(true)}
        onExport={handleExport}
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
            Qarzlar
            <Badge variant="secondary" className="border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-500">
              {debtor.debts?.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="payments">
            To&apos;lovlar
            <Badge
              variant="secondary"
              className="border-green-500/20 bg-green-500/10 text-green-700 dark:text-green-500"
            >
              {debtor.payments?.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="timeline">Vaqt chizig&apos;i</TabsTrigger>
        </TabsList>
        <TabsContent value="debts" className="mt-4">
          {debtor.debts && <DebtHistoryTable debts={debtor.debts} onRefresh={refresh} />}
        </TabsContent>
        <TabsContent value="payments" className="mt-4">
          {debtor.payments && <PaymentHistoryTable payments={debtor.payments} onRefresh={refresh} />}
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
    </div>
  );
}

export function DebtorDetailClient({
  debtor: initialDebtor,
  overdueDays,
}: {
  debtor: DebtorDomain;
  overdueDays: number;
}) {
  return <DebtorDetailContent initialDebtor={initialDebtor} overdueDays={overdueDays} />;
}
