"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { paymentSchema, type PaymentFormValues } from "../model";
import { createPayment } from "../api";
import { QuickAddPaymentForm } from "./quick-add-payment-form";

export interface QuickAddPaymentProps {
  debtorId: number;
  debtorName: string;
  totalDebt: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void | Promise<void>;
}

export function QuickAddPayment({
  debtorId,
  debtorName,
  totalDebt,
  open,
  onOpenChange,
  onSuccess,
}: QuickAddPaymentProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const refreshAfterCloseRef = React.useRef(false);

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { amount: "", payment_type: "CASH", note: "" },
  });

  const onSubmit = async (data: PaymentFormValues) => {
    setIsLoading(true);
    try {
      const cleanAmount = data.amount.replace(/\s/g, "");
      await createPayment({
        debtor_id: debtorId,
        amount: parseFloat(cleanAmount),
        payment_type: data.payment_type,
        note: data.note || null,
      });

      toast.success("To'lov muvaffaqiyatli qo'shildi");
      form.reset();
      refreshAfterCloseRef.current = true;
      onOpenChange(false);

      requestAnimationFrame(() => {
        setTimeout(() => {
          router.refresh();
          onSuccess?.();
          refreshAfterCloseRef.current = false;
        }, 150);
      });
    } catch (error) {
      console.error(error);
      toast.error("To'lov qo'shishda xatolik yuz berdi");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <QuickAddPaymentForm
      open={open}
      onOpenChange={onOpenChange}
      debtorName={debtorName}
      totalDebt={totalDebt}
      form={form}
      isLoading={isLoading}
      onSubmit={onSubmit}
    />
  );
}
