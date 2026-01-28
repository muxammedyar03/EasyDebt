"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { paymentSchema } from "@/app/(main)/dashboard/default/_components/schema";
import { QuickAddPaymentForm } from "./quick-add-payment-form";

type PaymentFormValues = z.infer<typeof paymentSchema>;

interface QuickAddPaymentProps {
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
    defaultValues: {
      amount: "",
      payment_type: "CASH",
      note: "",
    },
  });

  const onSubmit = async (data: PaymentFormValues) => {
    setIsLoading(true);
    try {
      // Remove spaces before parsing
      const cleanAmount = data.amount.replace(/\s/g, "");
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          debtor_id: debtorId,
          amount: parseFloat(cleanAmount),
          payment_type: data.payment_type,
          note: data.note || null,
        }),
      });

      if (!response.ok) {
        throw new Error("To'lov qo'shishda xatolik");
      }

      toast.success("To'lov muvaffaqiyatli qo'shildi");
      form.reset();
      refreshAfterCloseRef.current = true;
      onOpenChange(false);

      // Refresh after dialog animation completes
      requestAnimationFrame(() => {
        setTimeout(() => {
          router.refresh();
          if (onSuccess) {
            onSuccess();
          }
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
