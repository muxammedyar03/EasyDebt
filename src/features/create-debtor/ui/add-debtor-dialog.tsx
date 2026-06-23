"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getErrorMessage } from "@/lib/errors";
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
import { addDebtorSchema, type AddDebtorFormData } from "@/lib/validation";
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
      toast.error(getErrorMessage(error, "Qarzdor qo'shishda xatolik yuz berdi"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Добавить нового дебитора</DialogTitle>
          <DialogDescription>Введите информацию о новом дебитере</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="first_name">
                Имя <span className="text-destructive">*</span>
              </Label>
              <Input id="first_name" placeholder="Имя" {...register("first_name")} disabled={isLoading} />
              {errors.first_name && <p className="text-destructive text-sm">{errors.first_name.message}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="last_name">
                Фамилия <span className="text-destructive">*</span>
              </Label>
              <Input id="last_name" placeholder="Фамилия" {...register("last_name")} disabled={isLoading} />
              {errors.last_name && <p className="text-destructive text-sm">{errors.last_name.message}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="phone_number">Телефон</Label>
              <Controller
                name="phone_number"
                control={control}
                render={({ field }) => (
                  <Input
                    id="phone_number"
                    placeholder="+998 XX XXX XX XX"
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
              <Label htmlFor="address">Адрес</Label>
              <Input id="address" placeholder="Адрес" {...register("address")} disabled={isLoading} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="debt_amount">Сумма долга</Label>
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
              <Label htmlFor="debt_description">Описание долга</Label>
              <Input
                id="debt_description"
                placeholder="Описание долга"
                {...register("debt_description")}
                disabled={isLoading}
              />
            </div>
          </div>

          <DialogFooter className="grid gap-2 md:grid-cols-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Отмена
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Добавить
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
