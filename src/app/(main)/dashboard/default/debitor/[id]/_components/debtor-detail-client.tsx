"use client";

import * as React from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

import { AddDebtDialog } from "../../../_components/add-debt-dialog";
import { AddPaymentDialog } from "../../../_components/add-payment-dialog";
import { DebtHistoryTable } from "./debt-history-table";
import { PaymentHistoryTable } from "./payment-history-table";
import { DebtorProvider, useDebtor } from "./context/debtor-context";
import { DebtorHeader } from "./header";
import { DebtorTimeline } from "./timeline";
import { StatsCards } from "./stats-cards";

interface DebtorDetailClientProps {
  debtor: {
    id: number;
    first_name: string;
    last_name: string;
    phone_number: string | null;
    address: string | null;
    total_debt: number;
    created_at: Date | string;
    updated_at: Date | string;
    debts: Array<{
      id: number;
      amount: number;
      description: string | null;
      created_at: Date | string;
    }>;
    payments: Array<{
      id: number;
      amount: number;
      payment_type: string;
      note: string | null;
      created_at: Date | string;
    }>;
  };
}

function DebtorDetailContent() {
  const { debtor, refresh } = useDebtor();
  const [debtDialogOpen, setDebtDialogOpen] = React.useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = React.useState(false);

  const handleDialogSuccess = React.useCallback(async () => {
    console.log("💚 Dialog success - calling refresh");
    await refresh();
  }, [refresh]);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <DebtorHeader onAddDebt={() => setDebtDialogOpen(true)} onAddPayment={() => setPaymentDialogOpen(true)} />

      {/* Stats Cards */}
      <StatsCards />

      {/* History Tabs */}
      <Tabs defaultValue="debts" className="w-full">
        <TabsList className="grid h-10 w-full grid-cols-3 md:w-1/2 lg:w-1/2">
          <TabsTrigger value="debts">
            Qarzlar tarixi
            <Badge variant="secondary" className="">
              {debtor.debts.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="payments">
            To&apos;lovlar tarixi
            <Badge variant="secondary" className="">
              {debtor.payments.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="timeline">Vaqt chizig&apos;i</TabsTrigger>
        </TabsList>
        <TabsContent value="debts" className="mt-4">
          <DebtHistoryTable debts={debtor.debts} />
        </TabsContent>
        <TabsContent value="payments" className="mt-4">
          <PaymentHistoryTable payments={debtor.payments} />
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
        debtorName={`${debtor.first_name} ${debtor.last_name}`}
        onSuccess={handleDialogSuccess}
      />
      <AddPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        debtorId={debtor.id}
        debtorName={`${debtor.first_name} ${debtor.last_name}`}
        onSuccess={handleDialogSuccess}
      />
    </div>
  );
}

export function DebtorDetailClient({ debtor: initialDebtor }: DebtorDetailClientProps) {
  return (
    <DebtorProvider initialDebtor={initialDebtor}>
      <DebtorDetailContent />
    </DebtorProvider>
  );
}
