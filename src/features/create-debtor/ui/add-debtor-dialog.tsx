"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { formatNumber, formatUzPhone } from "@/lib/format";
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
import { addDebtorSchema, type AddDebtorFormData } from "../model";
import { createDebtor } from "../api";

export interface AddDebtorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddDebtorDialog({ open, onOpenChange, onSuccess }: AddDebtorDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [debtAmount, setDebtAmount] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const refreshAfterCloseRef = React.useRef(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    control,
  } = useForm<AddDebtorFormData>({
    resolver: zodResolver(addDebtorSchema),
    defaultValues: { phone_number: "" },
  });

  const handleDebtAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatNumber(e.target.value);
    setDebtAmount(formatted);
    setValue("debt_amount", formatted);
  };

  const onSubmit = async (data: AddDebtorFormData) => {
    setIsLoading(true);
    try {
      const cleanAmount = data.debt_amount ? data.debt_amount.replace(/\s/g, "") : null;
      await createDebtor({
        first_name: data.first_name,
        last_name: data.last_name,
        phone_number: data.phone_number || null,
        address: data.address || null,
        debt_amount: cleanAmount ? parseFloat(cleanAmount) : null,
        debt_description: data.debt_description || null,
      });

      toast.success("Qarzdor muvaffaqiyatli qo'shildi");
      reset();
      setDebtAmount("");
      setPhone("");
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
      console.error("Error adding debtor:", error);
      toast.error(error instanceof Error ? error.message : "Qarzdor qo'shishda xatolik yuz berdi");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Yangi qarzdor qo&apos;shish</DialogTitle>
          <DialogDescription>Yangi qarzdor ma&apos;lumotlarini kiriting</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="first_name">
                Ism <span className="text-destructive">*</span>
              </Label>
              <Input id="first_name" placeholder="Ism" {...register("first_name")} disabled={isLoading} />
              {errors.first_name && <p className="text-destructive text-sm">{errors.first_name.message}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="last_name">
                Familiya <span className="text-destructive">*</span>
              </Label>
              <Input id="last_name" placeholder="Familiya" {...register("last_name")} disabled={isLoading} />
              {errors.last_name && <p className="text-destructive text-sm">{errors.last_name.message}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="phone_number">Telefon raqami</Label>
              <Controller
                name="phone_number"
                control={control}
                render={({ field }) => (
                  <Input
                    id="phone_number"
                    placeholder="+998 90 123 45 67"
                    value={phone}
                    onChange={(e) => {
                      const formatted = formatUzPhone(e.target.value);
                      setPhone(formatted);
                      field.onChange(formatted);
                    }}
                    inputMode="tel"
                    maxLength={18}
                    disabled={isLoading}
                  />
                )}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="address">Manzil</Label>
              <Input id="address" placeholder="Manzil" {...register("address")} disabled={isLoading} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="debt_amount">Qarz miqdori</Label>
              <Input
                id="debt_amount"
                type="text"
                placeholder="0"
                value={debtAmount}
                onChange={handleDebtAmountChange}
                disabled={isLoading}
                inputMode="numeric"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="debt_description">Qarz tavsifi</Label>
              <Input
                id="debt_description"
                placeholder="Qarz haqida ma'lumot"
                {...register("debt_description")}
                disabled={isLoading}
              />
            </div>
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
