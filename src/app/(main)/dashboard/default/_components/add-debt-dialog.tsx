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
import { Textarea } from "@/components/ui/textarea";

const addDebtSchema = z.object({
  amount: z.string().min(1, "Qarz miqdorini kiriting"),
  description: z.string().optional(),
});

type AddDebtFormData = z.infer<typeof addDebtSchema>;

interface AddDebtDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debtorId: number;
  debtorName: string;
  onSuccess?: () => void;
}

export function AddDebtDialog({ open, onOpenChange, debtorId, debtorName, onSuccess }: AddDebtDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AddDebtFormData>({
    resolver: zodResolver(addDebtSchema),
  });

  const onSubmit = async (data: AddDebtFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/debts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          debtor_id: debtorId,
          amount: parseFloat(data.amount),
          description: data.description || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Qarz qo'shishda xatolik yuz berdi");
      }

      toast.success("Qarz muvaffaqiyatli qo'shildi");
      reset();
      onOpenChange(false);

      if (onSuccess) {
        onSuccess();
      }

      router.refresh();
    } catch (error) {
      console.error("Error adding debt:", error);
      toast.error(error instanceof Error ? error.message : "Qarz qo'shishda xatolik yuz berdi");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Qarz qo&apos;shish</DialogTitle>
          <DialogDescription>{debtorName} uchun yangi qarz qo&apos;shish</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="amount">
                Qarz miqdori <span className="text-destructive">*</span>
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register("amount")}
                disabled={isLoading}
              />
              {errors.amount && <p className="text-destructive text-sm">{errors.amount.message}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Tavsif</Label>
              <Textarea
                id="description"
                placeholder="Qarz haqida ma'lumot"
                {...register("description")}
                disabled={isLoading}
                rows={3}
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
