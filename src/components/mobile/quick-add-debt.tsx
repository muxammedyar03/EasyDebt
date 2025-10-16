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
import { Textarea } from "@/components/ui/textarea";

const debtSchema = z.object({
  amount: z.string().min(1, "Summani kiriting"),
  description: z.string().optional(),
});

type DebtFormValues = z.infer<typeof debtSchema>;

interface QuickAddDebtProps {
  debtorId: number;
  debtorName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void | Promise<void>;
}

export function QuickAddDebt({ debtorId, debtorName, open, onOpenChange, onSuccess }: QuickAddDebtProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);

  const form = useForm<DebtFormValues>({
    resolver: zodResolver(debtSchema),
    defaultValues: {
      amount: "",
      description: "",
    },
  });

  const onSubmit = async (data: DebtFormValues) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/debts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          debtor_id: debtorId,
          amount: parseFloat(data.amount),
          description: data.description || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Qarz qo'shishda xatolik");
      }

      toast.success("Qarz muvaffaqiyatli qo'shildi");
      form.reset();
      onOpenChange(false);
      if (onSuccess) {
        await onSuccess();
      } else {
        router.refresh();
      }
    } catch (error) {
      console.error(error);
      toast.error("Qarz qo'shishda xatolik yuz berdi");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Qarz qo&apos;shish - {debtorName}</DialogTitle>
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Izoh</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Qarz haqida qisqacha ma'lumot..."
                      className="resize-none"
                      rows={3}
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
