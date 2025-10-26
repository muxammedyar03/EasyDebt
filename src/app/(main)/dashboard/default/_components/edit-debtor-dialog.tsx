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

const editDebtorSchema = z.object({
  first_name: z.string().min(1, "Ism kiritish shart"),
  last_name: z.string().min(1, "Familiya kiritish shart"),
  phone_number: z.string().optional(),
  address: z.string().optional(),
});

type EditDebtorFormData = z.infer<typeof editDebtorSchema>;

interface EditDebtorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debtor: {
    id: number;
    first_name: string;
    last_name: string;
    phone_number: string | null;
    address: string | null;
  };
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
      first_name: debtor.first_name,
      last_name: debtor.last_name,
      phone_number: debtor.phone_number || "",
      address: debtor.address || "",
    },
  });

  React.useEffect(() => {
    if (open) {
      reset({
        first_name: debtor.first_name,
        last_name: debtor.last_name,
        phone_number: debtor.phone_number || "",
        address: debtor.address || "",
      });
      setPhone(formatUzPhone(debtor.phone_number || ""));
    }
  }, [open, debtor, reset]);

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
        throw new Error(errorData.error || "Qarzdor ma'lumotlarini o'zgartirishda xatolik yuz berdi");
      }

      toast.success("Qarzdor ma'lumotlari muvaffaqiyatli o'zgartirildi");
      onOpenChange(false);

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error updating debtor:", error);
      toast.error(error instanceof Error ? error.message : "Qarzdor ma'lumotlarini o'zgartirishda xatolik yuz berdi");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Qarzdor ma&apos;lumotlarini o&apos;zgartirish</DialogTitle>
          <DialogDescription>Qarzdor ma&apos;lumotlarini tahrirlang</DialogDescription>
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
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Bekor qilish
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Saqlash
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
