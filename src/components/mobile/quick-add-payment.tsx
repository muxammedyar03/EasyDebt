"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const paymentSchema = z.object({
  amount: z.string().min(1, "Summani kiriting"),
  payment_type: z.enum(["CASH", "CLICK", "CARD"]),
  note: z.string().optional(),
});

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
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          debtor_id: debtorId,
          amount: parseFloat(data.amount),
          payment_type: data.payment_type,
          note: data.note || null,
        }),
      });

      if (!response.ok) {
        throw new Error("To'lov qo'shishda xatolik");
      }

      toast.success("To'lov muvaffaqiyatli qo'shildi");
      form.reset();
      onOpenChange(false);
      if (onSuccess) {
        await onSuccess();
      } else {
        router.refresh();
      }
    } catch (error) {
      console.error(error);
      toast.error("To'lov qo'shishda xatolik yuz berdi");
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("uz-UZ").format(amount) + " so'm";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>To&apos;lov qo&apos;shish - {debtorName}</DialogTitle>
          <p className="text-muted-foreground text-sm">
            Jami qarz: <span className="font-semibold">{formatCurrency(totalDebt)}</span>
          </p>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Summa *</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="0" {...field} autoFocus inputMode="numeric" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="payment_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>To&apos;lov turi *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Tanlang" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="CASH">Naqd</SelectItem>
                      <SelectItem value="CARD">Karta</SelectItem>
                      <SelectItem value="CLICK">Click</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Izoh</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="To'lov haqida qisqacha ma'lumot..."
                      className="resize-none"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Bekor qilish
              </Button>
              <Button type="submit" className="flex-1" disabled={isLoading}>
                {isLoading ? "Saqlanmoqda..." : "Saqlash"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
