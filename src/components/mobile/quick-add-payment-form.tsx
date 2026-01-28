import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../ui/form";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { paymentSchema } from "@/app/(main)/dashboard/default/_components/schema";
import { formatCurrencyUzs, formatNumber } from "@/lib/format";

interface QuickAddPaymentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debtorName: string;
  totalDebt: number;
  form: UseFormReturn<z.infer<typeof paymentSchema>>;
  isLoading: boolean;
  onSubmit: (data: z.infer<typeof paymentSchema>) => void;
}

export function QuickAddPaymentForm({
  open,
  onOpenChange,
  debtorName,
  totalDebt,
  form,
  isLoading,
  onSubmit,
}: QuickAddPaymentFormProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>To&apos;lov qo&apos;shish - {debtorName}</DialogTitle>
          <p className="text-muted-foreground text-sm">
            Jami qarz: <span className="font-semibold">{formatCurrencyUzs(totalDebt)}</span>
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
                    <Input
                      type="text"
                      placeholder="0"
                      {...field}
                      onChange={(e) => {
                        const formatted = formatNumber(e.target.value);
                        field.onChange(formatted);
                      }}
                      autoFocus
                      inputMode="numeric"
                    />
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
