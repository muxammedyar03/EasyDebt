"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Loader2, Calendar } from "lucide-react";
import { format } from "date-fns";
import { uz } from "date-fns/locale";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

const addDebtSchema = z.object({
  amount: z.string().min(1, "Qarz miqdorini kiriting"),
  description: z.string().optional(),
  createdAt: z.date().optional(),
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
  const [isLoading, setIsLoading] = React.useState(false);
  const [amount, setAmount] = React.useState("");
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(undefined);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<AddDebtFormData>({
    resolver: zodResolver(addDebtSchema),
  });

  const formatNumber = (value: string) => {
    // Remove all non-digit characters
    const numbers = value.replace(/\D/g, "");
    // Format with thousand separators
    return numbers.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1 ");
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatNumber(e.target.value);
    setAmount(formatted);
    setValue("amount", formatted);
  };

  const onSubmit = async (data: AddDebtFormData) => {
    setIsLoading(true);
    try {
      // Remove spaces before parsing
      const cleanAmount = data.amount.replace(/\s/g, "");
      const response = await fetch("/api/debts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          debtor_id: debtorId,
          amount: parseFloat(cleanAmount),
          description: data.description || null,
          created_at: DEV_MODE && selectedDate ? selectedDate.toISOString() : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Qarz qo'shishda xatolik yuz berdi");
      }

      toast.success("Qarz muvaffaqiyatli qo'shildi");
      reset();
      setAmount("");
      setSelectedDate(undefined);
      onOpenChange(false);

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error adding debt:", error);
      toast.error(error instanceof Error ? error.message : "Qarz qo'shishda xatolik yuz berdi");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Qarz qo&apos;shish</DialogTitle>
          <DialogDescription>{debtorName} uchun yangi qarz qo&apos;shish</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit(onSubmit)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.target instanceof HTMLInputElement) {
              e.preventDefault();
            }
          }}
        >
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="amount">
                Qarz miqdori <span className="text-destructive">*</span>
              </Label>
              <Input
                id="amount"
                type="text"
                placeholder="0"
                value={amount}
                onChange={handleAmountChange}
                disabled={isLoading}
                inputMode="numeric"
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

            {DEV_MODE && (
              <div className="grid gap-2">
                <Label>Sana (Dev Mode)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn("justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}
                      disabled={isLoading}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP", { locale: uz }) : "Sana tanlang"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus />
                  </PopoverContent>
                </Popover>
                <p className="text-muted-foreground text-xs">Bo&apos;sh qoldirilsa, hozirgi sana ishlatiladi.</p>
              </div>
            )}
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
