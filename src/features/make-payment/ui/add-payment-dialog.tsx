"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, Calendar } from "lucide-react";
import { format } from "date-fns";
import { uz } from "date-fns/locale";
import { useTranslations } from "next-intl";
import { getErrorMessage } from "@/lib/errors";
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
import { addPaymentSchema, type AddPaymentFormData } from "@/lib/validation";
import { createPayment } from "../api";
import { Checkbox } from "@/components/ui/checkbox";

export interface AddPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debtorId: number;
  debtorName: string;

  onSuccess?: (receiptInfo?: unknown) => void;
}

export function AddPaymentDialog({ open, onOpenChange, debtorId, debtorName, onSuccess }: AddPaymentDialogProps) {
  const router = useRouter();
  const t = useTranslations("payment");
  const tCommon = useTranslations("common");
  const [isLoading, setIsLoading] = React.useState(false);
  const [amount, setAmount] = React.useState("");
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(undefined);
  const [resetRating, setResetRating] = React.useState(false);
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
      const result = await createPayment({
        debtor_id: debtorId,
        amount: parseFloat(cleanAmount),
        payment_type: data.payment_type,
        note: data.note || null,
        resets_rating: resetRating,
        created_at: DEV_MODE && selectedDate ? selectedDate.toISOString() : undefined,
      });

      const response = result as Record<string, unknown> | undefined;
      const receiptInfo =
        response?.previousBalance !== undefined
          ? {
              type: "PAYMENT" as const,
              amount: parseFloat(cleanAmount),
              docNumber: (response.id as number) || 0,
              description: data.note || null,
              paymentType: data.payment_type,
              previousBalance: response.previousBalance as number,
              newBalance: response.newBalance as number,
              debtorName: (response.debtorName as string) || debtorName,
              debtorPhone: (response.debtorPhone as string) || null,
              employeeName: (response.employeeName as string) || null,
            }
          : undefined;

      toast.success(t("success"));
      reset();
      setAmount("");
      setSelectedDate(undefined);
      setResetRating(false);
      refreshAfterCloseRef.current = true;
      onOpenChange(false);

      requestAnimationFrame(() => {
        setTimeout(() => {
          if (!onSuccess) router.refresh();
          onSuccess?.(receiptInfo);
          refreshAfterCloseRef.current = false;
        }, 150);
      });
    } catch (error) {
      console.error("Error adding payment:", error);
      toast.error(getErrorMessage(error, t("error")));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description", { name: debtorName })}</DialogDescription>
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
                className="border-border h-11 border"
              />
              {errors.amount && <p className="text-destructive text-sm">{errors.amount.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="payment_type">
                {t("type")} <span className="text-destructive">*</span>
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
                    {t("cash")}
                  </TabsTrigger>
                  <TabsTrigger
                    value="CLICK"
                    disabled={isLoading}
                    className="dark:bg-input/30 cursor-pointer bg-white data-[state=active]:bg-indigo-500 data-[state=active]:text-white dark:data-[state=active]:bg-indigo-500"
                  >
                    {t("click")}
                  </TabsTrigger>
                  <TabsTrigger
                    value="CARD"
                    disabled={isLoading}
                    className="dark:bg-input/30 cursor-pointer bg-white data-[state=active]:bg-emerald-500 data-[state=active]:text-white dark:data-[state=active]:bg-emerald-500"
                  >
                    {t("card")}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="note">{t("note")}</Label>
              <Textarea
                id="note"
                placeholder={t("notePlaceholder")}
                {...register("note")}
                disabled={isLoading}
                rows={3}
                className="border-border border"
              />
            </div>
            <div className="border-border flex items-start gap-3 rounded-md border p-3">
              <Checkbox
                id="reset_rating"
                checked={resetRating}
                onCheckedChange={(checked) => setResetRating(checked === true)}
                disabled={isLoading}
              />
              <div className="grid gap-1">
                <Label htmlFor="reset_rating" className="cursor-pointer leading-none font-medium">
                  {t("resetRating")}
                </Label>
                <p className="text-muted-foreground text-xs">{t("resetRatingHint")}</p>
              </div>
            </div>
            {DEV_MODE && (
              <div className="grid gap-2">
                <Label>{t("dateDev")}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn("justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}
                      disabled={isLoading}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP", { locale: uz }) : t("pickDate")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus />
                  </PopoverContent>
                </Popover>
                <p className="text-muted-foreground text-xs">{t("dateHint")}</p>
              </div>
            )}
          </div>
          <DialogFooter className="grid gap-2 md:grid-cols-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tCommon("add")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
