"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, PaperclipIcon, Upload } from "lucide-react";
import { useTranslations } from "next-intl";

import { getErrorMessage } from "@/lib/errors";
import { formatNumber } from "@/lib/format";
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
import { addCompanyPaymentSchema, type AddCompanyPaymentFormData } from "@/lib/validation/company-payment";
import { createCompanyPayment, validateCompanyReceiptFile } from "../api";
import { invalidateRecentAuditActions } from "@/features/audit-log";

export interface AddCompanyPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: number;
  companyName: string;
  onSuccess?: () => void;
}

export function AddCompanyPaymentDialog({
  open,
  onOpenChange,
  companyId,
  companyName,
  onSuccess,
}: AddCompanyPaymentDialogProps) {
  const t = useTranslations("companyTransactions");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const queryClient = useQueryClient();
  const pendingRequest = React.useRef<{ key: string; fingerprint: string; receipt: File | null } | null>(null);
  const submitting = React.useRef(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [amount, setAmount] = React.useState("");
  const [receipt, setReceipt] = React.useState<File | null>(null);
  const [receiptError, setReceiptError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<AddCompanyPaymentFormData>({
    resolver: zodResolver(addCompanyPaymentSchema),
    defaultValues: { payment_type: "CASH" },
  });

  const paymentType = watch("payment_type");

  const onSubmit = async (data: AddCompanyPaymentFormData) => {
    if (submitting.current) return;
    submitting.current = true;
    setIsLoading(true);
    try {
      const fingerprint = JSON.stringify([companyId, data.amount, data.payment_type, data.note]);
      if (
        !pendingRequest.current ||
        pendingRequest.current.fingerprint !== fingerprint ||
        pendingRequest.current.receipt !== receipt
      )
        pendingRequest.current = { key: crypto.randomUUID(), fingerprint, receipt };
      await createCompanyPayment({
        idempotencyKey: pendingRequest.current.key,
        company_id: companyId,
        amount: parseFloat(data.amount.replace(/\s/g, "")),
        payment_type: data.payment_type,
        note: data.note?.trim() || null,
        receipt,
      });
      await invalidateRecentAuditActions(queryClient);
      pendingRequest.current = null;
      toast.success(t("paymentAdded"));
      reset({ payment_type: "CASH" });
      setAmount("");
      setReceipt(null);
      setReceiptError(null);
      onOpenChange(false);
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (!onSuccess) router.refresh();
          onSuccess?.();
        }, 150);
      });
    } catch (error) {
      toast.error(getErrorMessage(error, t("paymentAddError")));
    } finally {
      submitting.current = false;
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{t("addPaymentTitle")}</DialogTitle>
          <DialogDescription>
            {t.rich("addPaymentDescription", {
              company: () => <span className="font-medium">{companyName}</span>,
            })}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="amount">
                {tCommon("amount")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="amount"
                value={amount}
                disabled={isLoading}
                placeholder="0"
                onChange={(e) => {
                  const formatted = formatNumber(e.target.value);
                  setAmount(formatted);
                  setValue("amount", formatted, { shouldValidate: true });
                }}
              />
              {errors.amount && <p className="text-destructive text-sm">{t("paymentAmountRequired")}</p>}
            </div>

            <div className="grid gap-2">
              <Label>{t("paymentMethod")}</Label>
              <Tabs
                value={paymentType}
                onValueChange={(v) => setValue("payment_type", v as AddCompanyPaymentFormData["payment_type"])}
              >
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="CASH">{t("cash")}</TabsTrigger>
                  <TabsTrigger value="CLICK">Click</TabsTrigger>
                  <TabsTrigger value="CARD">{t("card")}</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="note">{tCommon("noteOptional")}</Label>
              <Textarea
                id="note"
                placeholder={t("paymentNotePlaceholder")}
                {...register("note")}
                disabled={isLoading}
              />
              {errors.note && <p className="text-destructive text-sm">{errors.note.message}</p>}
            </div>

            <div className="border-1.5 relative grid h-32 gap-2 rounded-xl border border-dashed border-gray-300 dark:border-gray-600">
              <Label
                htmlFor="receipt"
                className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center text-center"
              >
                <Upload className="text-muted-foreground size-10" strokeWidth={2.5} />
                <span className="text-muted-foreground text-xs">{t("attachmentLabel")}</span>
              </Label>
              <Input
                id="receipt"
                type="file"
                className="absolute top-0 left-0 h-full w-full opacity-0"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                disabled={isLoading}
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  if (!file) {
                    setReceipt(null);
                    setReceiptError(null);
                    return;
                  }
                  const err = validateCompanyReceiptFile(file, {
                    invalidType: t("attachmentInvalidType"),
                    tooLarge: t("attachmentTooLarge"),
                  });
                  setReceiptError(err);
                  setReceipt(err ? null : file);
                }}
              />
              {receiptError && <p className="text-destructive text-sm">{receiptError}</p>}
            </div>
            {receipt && !receiptError && (
              <p className="flex items-center text-sm">
                <PaperclipIcon className="mr-2 h-4 w-4" />
                {t("attachmentSelected", { name: receipt.name, size: Math.round(receipt.size / 1024) })}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={isLoading || Boolean(receiptError)}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("pay")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
