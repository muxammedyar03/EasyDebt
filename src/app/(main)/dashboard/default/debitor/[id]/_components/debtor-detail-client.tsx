"use client";

import * as React from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

import { AddDebtDialog } from "@/features/create-debt/ui";
import { AddPaymentDialog } from "@/features/make-payment/ui";
import { DebtHistoryTable } from "./debt-history-table";
import { PaymentHistoryTable } from "./payment-history-table";
import { DebtorProvider, useDebtor } from "./context/debtor-context";
import { DebtorHeader } from "./header";
import { DebtorTimeline } from "./timeline";
import { StatsCards } from "./stats-cards";
import { PaymentReminderDialog } from "./payment-reminder-dialog";
import { ReminderStatusCard } from "./reminder-status-card";
import { usePaymentReminder } from "@/hooks/use-payment-reminder";
import { DebtorDomain } from "@/types/domain";

function DebtorDetailContent() {
  const { debtor, refresh } = useDebtor();
  const [debtDialogOpen, setDebtDialogOpen] = React.useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = React.useState(false);
  const [reminderDialogOpen, setReminderDialogOpen] = React.useState(false);

  // Payment reminder hook - lifted to parent level
  const reminder = usePaymentReminder({
    debtorId: debtor?.id ?? 0,
    enabled: !!debtor?.id,
  });

  const handleDialogSuccess = React.useCallback(async () => {
    console.log("💚 Dialog success - calling refresh");
    await refresh();
  }, [refresh]);

  const handleReminderSuccess = React.useCallback(async () => {
    await reminder.refreshReminders();
  }, [reminder]);

  if (!debtor) {
    return <>Qarzdor topilmadi</>;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <DebtorHeader onAddDebt={() => setDebtDialogOpen(true)} onAddPayment={() => setPaymentDialogOpen(true)} />

      {/* Payment Reminder Status Card */}
      <ReminderStatusCard
        activeReminder={reminder.activeReminder}
        isLoading={reminder.isLoading}
        onOpenDialog={() => setReminderDialogOpen(true)}
      />

      {/* Stats Cards */}
      <StatsCards />

      {/* History Tabs */}
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
          {debtor.debts && <DebtHistoryTable debts={debtor.debts} />}
        </TabsContent>
        <TabsContent value="payments" className="mt-4">
          {debtor.payments && <PaymentHistoryTable payments={debtor.payments} />}
        </TabsContent>
        <TabsContent value="timeline" className="mt-4">
          <DebtorTimeline />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
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
  return (
    <DebtorProvider initialDebtor={initialDebtor} overdueDays={overdueDays}>
      <DebtorDetailContent />
    </DebtorProvider>
  );
}
