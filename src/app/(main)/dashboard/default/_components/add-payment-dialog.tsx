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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

const addPaymentSchema = z.object({
  amount: z.string().min(1, "To'lov miqdorini kiriting"),
  payment_type: z.enum(["CASH", "CLICK", "CARD"]),
  note: z.string().optional(),
  createdAt: z.date().optional(),
});

type AddPaymentFormData = z.infer<typeof addPaymentSchema>;

interface AddPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debtorId: number;
  debtorName: string;
  onSuccess?: () => void;
}

export function AddPaymentDialog({ open, onOpenChange, debtorId, debtorName, onSuccess }: AddPaymentDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [amount, setAmount] = React.useState("");
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(undefined);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<AddPaymentFormData>({
    resolver: zodResolver(addPaymentSchema),
    defaultValues: {
      payment_type: "CASH",
    },
  });

  const paymentType = watch("payment_type");

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

  const onSubmit = async (data: AddPaymentFormData) => {
    setIsLoading(true);
    try {
      // Remove spaces before parsing
      const cleanAmount = data.amount.replace(/\s/g, "");
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          debtor_id: debtorId,
          amount: parseFloat(cleanAmount),
          payment_type: data.payment_type,
          note: data.note || null,
          created_at: DEV_MODE && selectedDate ? selectedDate.toISOString() : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "To'lov qo'shishda xatolik yuz berdi");
      }

      toast.success("To'lov muvaffaqiyatli qo'shildi");
      reset();
      setAmount("");
      setSelectedDate(undefined);
      onOpenChange(false);

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error adding payment:", error);
      toast.error(error instanceof Error ? error.message : "To'lov qo'shishda xatolik yuz berdi");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>To&apos;lov qo&apos;shish</DialogTitle>
          <DialogDescription>{debtorName} uchun yangi to&apos;lov qo&apos;shish</DialogDescription>
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
                To&apos;lov miqdori <span className="text-destructive">*</span>
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
              <Label htmlFor="payment_type">
                To&apos;lov turi <span className="text-destructive">*</span>
              </Label>
              <Select
                value={paymentType}
                onValueChange={(value) => setValue("payment_type", value as "CASH" | "CLICK" | "CARD")}
                disabled={isLoading}
              >
                <SelectTrigger id="payment_type">
                  <SelectValue placeholder="To'lov turini tanlang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Naqd</SelectItem>
                  <SelectItem value="CLICK">Click</SelectItem>
                  <SelectItem value="CARD">Karta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="note">Izoh</Label>
              <Textarea
                id="note"
                placeholder="To'lov haqida ma'lumot"
                {...register("note")}
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
