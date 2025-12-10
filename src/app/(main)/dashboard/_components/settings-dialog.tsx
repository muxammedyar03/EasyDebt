"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDebtLimit: number;
  initialOverdueDays: number;
}

export function SettingsDialog({ open, onOpenChange, initialDebtLimit, initialOverdueDays }: SettingsDialogProps) {
  const router = useRouter();
  const [debtLimit, setDebtLimit] = React.useState(initialDebtLimit.toString());
  const [overdueDays, setOverdueDays] = React.useState(initialOverdueDays.toString());
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    setDebtLimit(initialDebtLimit.toString());
  }, [initialDebtLimit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (process.env.NODE_ENV === "production") {
      toast.error("Demo modda, sozlamalar o'zgartirish imkoni yo'q");
      return;
    }
    setIsLoading(true);

    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "debt_limit",
          value: debtLimit,
        }),
      });
      const response2 = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "overdue_days",
          value: overdueDays,
        }),
      });

      if (response.ok && response2.ok) {
        toast.success("Sozlamalar saqlandi");
        router.refresh();
        onOpenChange(false);
      } else {
        toast.error("Xatolik yuz berdi");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Xatolik yuz berdi");
    } finally {
      setIsLoading(false);
    }
  };

  const formatNumber = (value: string) => {
    const number = value.replace(/\D/g, "");
    return new Intl.NumberFormat("uz-UZ").format(Number(number));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sozlamalar</DialogTitle>
          <DialogDescription>Qarzdorlar uchun maksimal qarz limitini belgilang</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="debt_limit">{"Qarz limiti (so'm)"}</Label>
            <Input
              id="debt_limit"
              type="text"
              value={formatNumber(debtLimit)}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "");
                setDebtLimit(value);
              }}
              placeholder="2000000"
              required
            />
            <p className="text-muted-foreground text-sm">
              Joriy limit: {formatNumber(debtLimit)} {"so'm"}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="overdue_days">Muddati o&apos;tish kuni (kun)</Label>
            <Input
              id="overdue_days"
              type="number"
              min={1}
              value={overdueDays}
              onChange={(e) => setOverdueDays(e.target.value.replace(/\D/g, ""))}
              placeholder="45"
              required
            />
            <p className="text-muted-foreground text-sm">Joriy muddat: {overdueDays} kun</p>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Bekor qilish
            </Button>
            <Button type="submit" disabled={isLoading || process.env.NODE_ENV === "production"}>
              {isLoading ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
