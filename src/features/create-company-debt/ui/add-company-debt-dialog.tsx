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
import { addCompanyDebtSchema, type AddCompanyDebtFormData } from "@/lib/validation/company-debt";
import { createCompanyDebt, validateCompanyReceiptFile } from "../api";
import { invalidateRecentAuditActions } from "@/features/audit-log";

export interface AddCompanyDebtDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: number;
  companyName: string;
  onSuccess?: () => void;
}

export function AddCompanyDebtDialog({
  open,
  onOpenChange,
  companyId,
  companyName,
  onSuccess,
}: AddCompanyDebtDialogProps) {
  const t = useTranslations("companyTransactions");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const queryClient = useQueryClient();
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
  } = useForm<AddCompanyDebtFormData>({
    resolver: zodResolver(addCompanyDebtSchema),
  });

  const onSubmit = async (data: AddCompanyDebtFormData) => {
    setIsLoading(true);
    try {
      await createCompanyDebt({
        company_id: companyId,
        amount: parseFloat(data.amount.replace(/\s/g, "")),
        note: data.note?.trim() || null,
        receipt,
      });
      await invalidateRecentAuditActions(queryClient);
      toast.success(t("debtAdded"));
      reset();
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
      toast.error(getErrorMessage(error, t("debtAddError")));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t("addDebtTitle")}</DialogTitle>
          <DialogDescription>
            {t.rich("addDebtDescription", {
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
              {errors.amount && <p className="text-destructive text-sm">{t("debtAmountRequired")}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="note">{tCommon("noteOptional")}</Label>
              <Textarea id="note" placeholder={t("debtNotePlaceholder")} {...register("note")} disabled={isLoading} />
            </div>
            <div className="relative grid h-32 gap-2 rounded-xl border border-dashed border-gray-300 dark:border-gray-600">
              <Label
                htmlFor="debt-receipt"
                className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center text-center"
              >
                <Upload className="size-10" strokeWidth={2.5} />
                <span className="text-muted-foreground text-xs">{t("attachmentLabel")}</span>
              </Label>
              <Input
                id="debt-receipt"
                type="file"
                className="absolute top-0 left-0 h-full w-full cursor-pointer opacity-0"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                disabled={isLoading}
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  if (!file) {
                    setReceipt(null);
                    setReceiptError(null);
                    return;
                  }
                  const error = validateCompanyReceiptFile(file, {
                    invalidType: t("attachmentInvalidType"),
                    tooLarge: t("attachmentTooLarge"),
                  });
                  setReceiptError(error);
                  setReceipt(error ? null : file);
                }}
              />
            </div>
            {receiptError && <p className="text-destructive text-sm">{receiptError}</p>}
          </div>
          {receipt && !receiptError && (
            <p className="flex items-center text-sm">
              <PaperclipIcon className="mr-2 h-4 w-4" />
              {t("attachmentSelected", { name: receipt.name, size: Math.round(receipt.size / 1024) })}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={isLoading || Boolean(receiptError)}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tCommon("add")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
