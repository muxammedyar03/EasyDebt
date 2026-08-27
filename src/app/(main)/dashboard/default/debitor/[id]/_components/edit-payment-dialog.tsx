"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Loader2, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ru, uz } from "date-fns/locale";
import { useLocale, useTranslations } from "next-intl";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { PaymentDomain } from "@/types/domain";

type EditPaymentFormData = {
  amount: string;
  payment_type: "CASH" | "CLICK" | "CARD";
  note?: string;
  createdAt?: Date;
};

interface EditPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: PaymentDomain;
  onSuccess?: () => void;
}

export function EditPaymentDialog({ open, onOpenChange, payment, onSuccess }: EditPaymentDialogProps) {
  const t = useTranslations("payment");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const dateLocale = locale === "ru" ? ru : uz;

  const editPaymentSchema = React.useMemo(
    () =>
      z.object({
        amount: z.string().min(1, t("amountRequired")),
        payment_type: z.enum(["CASH", "CLICK", "CARD"]),
        note: z.string().optional(),
        createdAt: z.date().optional(),
      }),
    [t],
  );

  const [isLoading, setIsLoading] = React.useState(false);
  const [amount, setAmount] = React.useState(payment.amount.toLocaleString());
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(new Date(payment.createdAt));

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<EditPaymentFormData>({
    resolver: zodResolver(editPaymentSchema),
    defaultValues: {
      amount: payment.amount.toString(),
      payment_type: payment.paymentType as "CASH" | "CLICK" | "CARD",
      note: payment.note || "",
    },
  });

  const paymentType = watch("payment_type");

  React.useEffect(() => {
    if (open) {
      setAmount(payment.amount.toLocaleString());
      setSelectedDate(new Date(payment.createdAt));
      setValue("amount", payment.amount.toString());
      setValue("payment_type", payment.paymentType as "CASH" | "CLICK" | "CARD");
      setValue("note", payment.note || "");
    }
  }, [open, payment, setValue]);

  const formatNumber = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    return numbers.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1 ");
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatNumber(e.target.value);
    setAmount(formatted);
    setValue("amount", formatted);
  };

  const onSubmit = async (data: EditPaymentFormData) => {
    setIsLoading(true);
    try {
      const cleanAmount = data.amount.replace(/\s/g, "");
      const response = await fetch(`/api/payments/${payment.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: parseFloat(cleanAmount),
          payment_type: data.payment_type,
          note: data.note || null,
          created_at: DEV_MODE && selectedDate ? selectedDate.toISOString() : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t("editError"));
      }

      toast.success(t("editSuccess"));
      onOpenChange(false);

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error updating payment:", error);
      toast.error(error instanceof Error ? error.message : t("editError"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("editTitle")}</DialogTitle>
          <DialogDescription>{t("editDescription")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="amount">
                {t("amount")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="amount"
                type="text"
                placeholder="0"
                value={amount}
                onChange={handleAmountChange}
                disabled={isLoading}
                inputMode="numeric"
              />
              {errors.amount && <p className="text-destructive text-sm">{errors.amount.message}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="payment_type">
                {t("type")} <span className="text-destructive">*</span>
              </Label>
              <Select
                value={paymentType}
                onValueChange={(value) => setValue("payment_type", value as "CASH" | "CLICK" | "CARD")}
                disabled={isLoading}
              >
                <SelectTrigger id="payment_type">
                  <SelectValue placeholder={t("typePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">{t("cash")}</SelectItem>
                  <SelectItem value="CLICK">{t("click")}</SelectItem>
                  <SelectItem value="CARD">{t("card")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="note">{t("note")}</Label>
              <Textarea
                id="note"
                placeholder={t("notePlaceholder")}
                {...register("note")}
                disabled={isLoading}
                rows={3}
              />
            </div>

            {DEV_MODE && (
              <div className="grid gap-2">
                <Label>{t("dateDev")}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}
                      disabled={isLoading}
                      type="button"
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP", { locale: dateLocale }) : t("pickDate")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus />
                  </PopoverContent>
                </Popover>
                <p className="text-muted-foreground text-xs">{t("editDateHint")}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tCommon("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
