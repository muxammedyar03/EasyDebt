"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, Calendar } from "lucide-react";
import { format } from "date-fns";
import { uz } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DEV_MODE } from "@/lib/dev-mode";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { formatNumber } from "@/lib/format";
import { addPaymentSchema, type AddPaymentFormData } from "../model";
import { createPayment } from "../api";

export interface AddPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debtorId: number;
  debtorName: string;
  onSuccess?: () => void;
}

export function AddPaymentDialog({ open, onOpenChange, debtorId, debtorName, onSuccess }: AddPaymentDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [amount, setAmount] = React.useState("");
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(undefined);
  const refreshAfterCloseRef = React.useRef(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<AddPaymentFormData>({
    resolver: zodResolver(addPaymentSchema),
    defaultValues: { payment_type: "CASH" },
  });

  const paymentType = watch("payment_type");

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(formatNumber(e.target.value));
    setValue("amount", formatNumber(e.target.value));
  };

  const onSubmit = async (data: AddPaymentFormData) => {
    setIsLoading(true);
    try {
      const cleanAmount = data.amount.replace(/\s/g, "");
      await createPayment({
        debtor_id: debtorId,
        amount: parseFloat(cleanAmount),
        payment_type: data.payment_type,
        note: data.note || null,
        created_at: DEV_MODE && selectedDate ? selectedDate.toISOString() : undefined,
      });

      toast.success("To'lov muvaffaqiyatli qo'shildi");
      reset();
      setAmount("");
      setSelectedDate(undefined);
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
      console.error("Error adding payment:", error);
      toast.error(error instanceof Error ? error.message : "To'lov qo'shishda xatolik yuz berdi");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>To&apos;lov qo&apos;shish</DialogTitle>
          <DialogDescription>{debtorName} uchun yangi to&apos;lov qo&apos;shish</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit(onSubmit)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.target instanceof HTMLTextAreaElement) e.preventDefault();
          }}
        >
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="amount">
                To&apos;lov miqdori <span className="text-destructive">*</span>
              </Label>
              <Input
                id="amount"
                type="text"
                placeholder="0"
                value={amount}
                onChange={handleAmountChange}
                disabled={isLoading}
                inputMode="numeric"
                className="border-border h-11 border"
              />
              {errors.amount && <p className="text-destructive text-sm">{errors.amount.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="payment_type">
                To&apos;lov turi <span className="text-destructive">*</span>
              </Label>
              <Tabs
                value={paymentType}
                onValueChange={(v) => setValue("payment_type", v as "CASH" | "CLICK" | "CARD")}
                className="w-full"
              >
                <TabsList className="dark:bg-input/30 border-border grid h-11 w-full grid-cols-3 gap-1 bg-zinc-200 p-1 dark:border">
                  <TabsTrigger
                    value="CASH"
                    disabled={isLoading}
                    className="dark:bg-input/30 cursor-pointer bg-white data-[state=active]:bg-orange-500 data-[state=active]:text-white dark:data-[state=active]:bg-orange-500"
                  >
                    Naqd
                  </TabsTrigger>
                  <TabsTrigger
                    value="CLICK"
                    disabled={isLoading}
                    className="dark:bg-input/30 cursor-pointer bg-white data-[state=active]:bg-indigo-500 data-[state=active]:text-white dark:data-[state=active]:bg-indigo-500"
                  >
                    Click
                  </TabsTrigger>
                  <TabsTrigger
                    value="CARD"
                    disabled={isLoading}
                    className="dark:bg-input/30 cursor-pointer bg-white data-[state=active]:bg-emerald-500 data-[state=active]:text-white dark:data-[state=active]:bg-emerald-500"
                  >
                    Karta
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="note">Izoh</Label>
              <Textarea
                id="note"
                placeholder="To'lov haqida ma'lumot"
                {...register("note")}
                disabled={isLoading}
                rows={3}
                className="border-border border"
              />
            </div>
            {DEV_MODE && (
              <div className="grid gap-2">
                <Label>Sana (Dev Mode)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn("justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}
                      disabled={isLoading}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP", { locale: uz }) : "Sana tanlang"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus />
                  </PopoverContent>
                </Popover>
                <p className="text-muted-foreground text-xs">Bo&apos;sh qoldirilsa, hozirgi sana ishlatiladi.</p>
              </div>
            )}
          </div>
          <DialogFooter className="grid gap-2 md:grid-cols-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Bekor qilish
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Qo&apos;shish
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
