"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

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
import { createCompanyDebt } from "../api";
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
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = React.useState(false);
  const [amount, setAmount] = React.useState("");

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
      });
      await invalidateRecentAuditActions(queryClient);
      toast.success("Qarz qo'shildi");
      reset();
      setAmount("");
      onOpenChange(false);
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (!onSuccess) router.refresh();
          onSuccess?.();
        }, 150);
      });
    } catch (error) {
      toast.error(getErrorMessage(error, "Qarz qo'shishda xatolik"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Qarz qo&apos;shish</DialogTitle>
          <DialogDescription>
            <span className="font-medium">{companyName}</span> dan mahsulot/qarz olish
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="amount">
                Summa <span className="text-destructive">*</span>
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
              {errors.amount && <p className="text-destructive text-sm">{errors.amount.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="note">Izoh (ixtiyoriy)</Label>
              <Textarea id="note" placeholder="Mahsulot / sabab..." {...register("note")} disabled={isLoading} />
            </div>
          </div>
          <DialogFooter>
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
