"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Loader2 } from "lucide-react";

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

const addDebtorSchema = z.object({
  first_name: z.string().min(1, "Ism kiritish shart"),
  last_name: z.string().min(1, "Familiya kiritish shart"),
  phone_number: z.string().optional(),
  address: z.string().optional(),
  debt_amount: z.string().optional(),
  debt_description: z.string().optional(),
});

type AddDebtorFormData = z.infer<typeof addDebtorSchema>;

interface AddDebtorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddDebtorDialog({ open, onOpenChange, onSuccess }: AddDebtorDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AddDebtorFormData>({
    resolver: zodResolver(addDebtorSchema),
  });

  const onSubmit = async (data: AddDebtorFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/debtors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          first_name: data.first_name,
          last_name: data.last_name,
          phone_number: data.phone_number || null,
          address: data.address || null,
          debt_amount: data.debt_amount ? parseFloat(data.debt_amount) : null,
          debt_description: data.debt_description || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Qarzdor qo'shishda xatolik yuz berdi");
      }

      toast.success("Qarzdor muvaffaqiyatli qo'shildi");
      reset();
      onOpenChange(false);

      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }

      router.refresh();
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
              <Input
                id="phone_number"
                placeholder="+998 90 123 45 67"
                {...register("phone_number")}
                disabled={isLoading}
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
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register("debt_amount")}
                disabled={isLoading}
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
