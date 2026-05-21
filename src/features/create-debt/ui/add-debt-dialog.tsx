"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, Calendar } from "lucide-react";
import { format } from "date-fns";
import { uz } from "date-fns/locale";
import { getErrorMessage } from "@/lib/errors";
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
import { addDebtSchema, type AddDebtFormData } from "@/lib/validation";
import { createDebt } from "../api";

const formatNumber = (value: string) => {
  const numbers = value.replace(/\D/g, "");
  return numbers.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1 ");
};

export interface AddDebtDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debtorId: number;
  debtorName: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSuccess?: (receiptInfo?: any) => void;
}

export function AddDebtDialog({ open, onOpenChange, debtorId, debtorName, onSuccess }: AddDebtDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [amount, setAmount] = React.useState("");
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(undefined);
  const refreshAfterCloseRef = React.useRef(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<AddDebtFormData>({
    resolver: zodResolver(addDebtSchema),
  });

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatNumber(e.target.value);
    setAmount(formatted);
    setValue("amount", formatted);
  };

  const onSubmit = async (data: AddDebtFormData) => {
    setIsLoading(true);
    try {
      const cleanAmount = data.amount.replace(/\s/g, "");
      const result = await createDebt({
        debtor_id: debtorId,
        amount: parseFloat(cleanAmount),
        description: data.description || null,
        created_at: DEV_MODE && selectedDate ? selectedDate.toISOString() : undefined,
      });

      // Receipt info ni API response dan olish
      const response = result as Record<string, unknown> | undefined;
      const receiptInfo =
        response?.previousBalance !== undefined
          ? {
              type: "DEBT" as const,
              amount: parseFloat(cleanAmount),
              docNumber: (response.id as number) || 0,
              description: data.description || null,
              previousBalance: response.previousBalance as number,
              newBalance: response.newBalance as number,
              debtorName: (response.debtorName as string) || debtorName,
              debtorPhone: (response.debtorPhone as string) || null,
              employeeName: (response.employeeName as string) || null,
            }
          : undefined;

      toast.success("Qarz muvaffaqiyatli qo'shildi");
      reset();
      setAmount("");
      setSelectedDate(undefined);
      refreshAfterCloseRef.current = true;
      onOpenChange(false);

      requestAnimationFrame(() => {
        setTimeout(() => {
          if (!onSuccess) router.refresh();
          onSuccess?.(receiptInfo);
          refreshAfterCloseRef.current = false;
        }, 150);
      });
    } catch (error) {
      console.error("Error adding debt:", error);
      toast.error(getErrorMessage(error, "Qarz qo'shishda xatolik yuz berdi"));
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
            if (e.key === "Enter" && e.target instanceof HTMLTextAreaElement) e.preventDefault();
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
