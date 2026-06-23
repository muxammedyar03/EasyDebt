"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { formatUzPhone } from "@/lib/format";

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
import type { DebtorView } from "@/types/view";
import { t } from "@/lib/i18n";

const editDebtorSchema = z.object({
  first_name: z.string().min(1, "Введите имя"),
  last_name: z.string().min(1, "Введите фамилию"),
  phone_number: z.string().optional(),
  address: z.string().optional(),
});

type EditDebtorFormData = z.infer<typeof editDebtorSchema>;

interface EditDebtorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debtor: DebtorView;
  onSuccess?: () => void;
}

export function EditDebtorDialog({ open, onOpenChange, debtor, onSuccess }: EditDebtorDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [phone, setPhone] = React.useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
  } = useForm<EditDebtorFormData>({
    resolver: zodResolver(editDebtorSchema),
    defaultValues: {
      first_name: debtor.firstName,
      last_name: debtor.lastName,
      phone_number: debtor.phoneNumber || "",
      address: debtor.address || "",
    },
  });

  React.useEffect(() => {
    if (open && debtor) {
      reset({
        first_name: debtor.firstName,
        last_name: debtor.lastName,
        phone_number: debtor.phoneNumber || "",
        address: debtor.address || "",
      });
      setPhone(formatUzPhone(debtor.phoneNumber || ""));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, debtor.id]);

  const onSubmit = async (data: EditDebtorFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/debtors/${debtor.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          first_name: data.first_name,
          last_name: data.last_name,
          phone_number: data.phone_number || null,
          address: data.address || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Ошибка при обновлении данных дебитора");
      }

      toast.success("Данные дебитора успешно обновлены");
      onOpenChange(false);

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error updating debtor:", error);
      toast.error(error instanceof Error ? error.message : "Ошибка при обновлении данных дебитора");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>{t("debtors.editDebtor")}</DialogTitle>
          <DialogDescription>{t("debtors.editDebtorDescription")}</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit(onSubmit)}
          onClickCapture={(e) => e.stopPropagation()}
          onKeyDownCapture={(e) => {
            if (e.key === "Enter") {
              e.stopPropagation();
            }
          }}
        >
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="first_name">
                Имя <span className="text-destructive">*</span>
              </Label>
              <Input id="first_name" placeholder="Ism" {...register("first_name")} disabled={isLoading} />
              {errors.first_name && <p className="text-destructive text-sm">{errors.first_name.message}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="last_name">
                Фамилия <span className="text-destructive">*</span>
              </Label>
              <Input id="last_name" placeholder="Familiya" {...register("last_name")} disabled={isLoading} />
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
              <Label htmlFor="address">Адрес</Label>
              <Input id="address" placeholder="Адрес" {...register("address")} disabled={isLoading} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Отмена
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Сохранить
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
