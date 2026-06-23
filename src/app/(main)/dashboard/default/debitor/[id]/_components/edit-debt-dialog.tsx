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
import { DebtDomain } from "@/types/domain";
import { t } from "@/lib/i18n";

const editDebtSchema = z.object({
  amount: z.string().min(1, "Введите сумму долга"),
  description: z.string().optional(),
  createdAt: z.date().optional(),
});

type EditDebtFormData = z.infer<typeof editDebtSchema>;

interface EditDebtDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debt: DebtDomain;
  onSuccess?: () => void;
}

export function EditDebtDialog({ open, onOpenChange, debt, onSuccess }: EditDebtDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [amount, setAmount] = React.useState(debt.amount.toLocaleString());
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(new Date(debt.createdAt));

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<EditDebtFormData>({
    resolver: zodResolver(editDebtSchema),
    defaultValues: {
      amount: debt.amount.toString(),
      description: debt.description || "",
    },
  });

  React.useEffect(() => {
    if (open) {
      setAmount(debt.amount.toLocaleString());
      setSelectedDate(new Date(debt.createdAt));
      setValue("amount", debt.amount.toString());
      setValue("description", debt.description || "");
    }
  }, [open, debt, setValue]);

  const formatNumber = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    return numbers.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1 ");
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatNumber(e.target.value);
    setAmount(formatted);
    setValue("amount", formatted);
  };

  const onSubmit = async (data: EditDebtFormData) => {
    setIsLoading(true);
    try {
      const cleanAmount = data.amount.replace(/\s/g, "");
      const response = await fetch(`/api/debts/${debt.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: parseFloat(cleanAmount),
          description: data.description || null,
          created_at: DEV_MODE && selectedDate ? selectedDate.toISOString() : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Qarzni yangilashda xatolik yuz berdi");
      }

      toast.success("Qarz muvaffaqiyatli yangilandi");
      onOpenChange(false);

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error updating debt:", error);
      toast.error(error instanceof Error ? error.message : "Qarzni yangilashda xatolik yuz berdi");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("debtors.editDebt")}</DialogTitle>
          <DialogDescription>{t("debtors.editDebtDescription")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="amount">
                Сумма долга <span className="text-destructive">*</span>
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
              <Label htmlFor="description">Описание</Label>
              <Textarea
                id="description"
                placeholder="Описание долга"
                {...register("description")}
                disabled={isLoading}
                rows={3}
              />
            </div>

            {DEV_MODE && (
              <div className="grid gap-2">
                <Label>Дата (Dev Mode)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}
                      disabled={isLoading}
                      type="button"
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP", { locale: uz }) : "Sana tanlang"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus />
                  </PopoverContent>
                </Popover>
                <p className="text-muted-foreground text-xs">{t("debtors.editDebtCreatedAtDescription")}</p>
              </div>
            )}
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
