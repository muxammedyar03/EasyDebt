"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

import { AddDebtDialog } from "../../../_components/add-debt-dialog";
import { AddPaymentDialog } from "../../../_components/add-payment-dialog";
import { DebtHistoryTable } from "./debt-history-table";
import { PaymentHistoryTable } from "./payment-history-table";

interface DebtorDetailClientProps {
  debtor: {
    id: number;
    first_name: string;
    last_name: string;
    phone_number: string | null;
    address: string | null;
    total_debt: number;
    created_at: Date;
    updated_at: Date;
    debts: Array<{
      id: number;
      amount: number;
      description: string | null;
      created_at: Date;
    }>;
    payments: Array<{
      id: number;
      amount: number;
      payment_type: string;
      note: string | null;
      created_at: Date;
    }>;
  };
}

export function DebtorDetailClient({ debtor: initialDebtor }: DebtorDetailClientProps) {
  const router = useRouter();
  const [debtor, setDebtor] = React.useState(initialDebtor);
  const [debtDialogOpen, setDebtDialogOpen] = React.useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = React.useState(false);

  const totalDebt = debtor.debts.reduce((sum, debt) => sum + debt.amount, 0);
  const totalPayment = debtor.payments.reduce((sum, payment) => sum + payment.amount, 0);

  const handleDataChange = React.useCallback(async () => {
    try {
      const response = await fetch(`/api/debtors/${debtor.id}`);
      if (response.ok) {
        const updatedDebtor = await response.json();
        setDebtor(updatedDebtor);
      }
    } catch (error) {
      console.error("Error refreshing debtor:", error);
    }
  }, [debtor.id]);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex w-full flex-col md:flex-row md:items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard/default")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {debtor.first_name} {debtor.last_name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {debtor.phone_number || "Telefon raqami yo'q"}
            </p>
          </div>
        </div>
        <div className="flex mt-5 md:mt-0 gap-2 justify-end">
          <Button variant="outline" onClick={() => setDebtDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Qarz qo'shish
          </Button>
          <Button variant="outline" onClick={() => setPaymentDialogOpen(true)}>
            <Minus className="h-4 w-4 mr-2" />
            To'lov qo'shish
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
        <Card className="py-4 gap-1 xl:gap-2">
          <CardHeader className="md:pb-3 !py-0 xl:!pb-4">
            <CardTitle className="text-sm font-medium">Umumiy qarz</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDebt.toLocaleString()} so'm</div>
          </CardContent>
        </Card>
        <Card className="py-4 gap-1 xl:gap-2">
          <CardHeader className="md:pb-3 !py-0 xl:!pb-4">
            <CardTitle className="text-sm font-medium">Umumiy to'lov</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {totalPayment.toLocaleString()} so'm
            </div>
          </CardContent>
        </Card>
        <Card className="py-4 gap-1 xl:gap-2">
          <CardHeader className="md:pb-3 !py-0 xl:!pb-4">
            <CardTitle className="text-sm font-medium">Qolgan qarz</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {debtor.total_debt.toLocaleString()} so'm
            </div>
          </CardContent>
        </Card>
        <Card className="py-4 gap-1 col-span-full xl:col-span-1">
          <CardHeader>
            <CardTitle>Ma'lumotlar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Manzil:</span>
              <span>{debtor.address || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Qo'shilgan sana:</span>
              <span>{new Date(debtor.created_at).toLocaleDateString("uz-UZ")}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Info */}

      {/* History Tabs */}
      <Tabs defaultValue="debts" className="w-full">
        <TabsList className="grid w-full md:w-1/2 lg:w-1/3 grid-cols-2">
          <TabsTrigger value="debts">
            Qarzlar tarixi
            <Badge variant="secondary" className="ml-2">
              {debtor.debts.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="payments">
            To'lovlar tarixi
            <Badge variant="secondary" className="ml-2">
              {debtor.payments.length}
            </Badge>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="debts" className="mt-4">
          <DebtHistoryTable debts={debtor.debts} />
        </TabsContent>
        <TabsContent value="payments" className="mt-4">
          <PaymentHistoryTable payments={debtor.payments} />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <AddDebtDialog
        open={debtDialogOpen}
        onOpenChange={setDebtDialogOpen}
        debtorId={debtor.id}
        debtorName={`${debtor.first_name} ${debtor.last_name}`}
        onSuccess={handleDataChange}
      />
      <AddPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        debtorId={debtor.id}
        debtorName={`${debtor.first_name} ${debtor.last_name}`}
        onSuccess={handleDataChange}
      />
    </div>
  );
}
