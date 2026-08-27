"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
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
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [debtLimit, setDebtLimit] = React.useState(initialDebtLimit.toString());
  const [overdueDays, setOverdueDays] = React.useState(initialOverdueDays.toString());
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    setDebtLimit(initialDebtLimit.toString());
    setOverdueDays(initialOverdueDays.toString());
  }, [initialDebtLimit, initialOverdueDays]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const requests = [];

      if (debtLimit !== initialDebtLimit.toString()) {
        requests.push(
          fetch("/api/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              key: "debt_limit",
              value: debtLimit,
            }),
          }),
        );
      }

      if (overdueDays !== initialOverdueDays.toString()) {
        requests.push(
          fetch("/api/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              key: "overdue_days",
              value: overdueDays,
            }),
          }),
        );
      }

      if (requests.length === 0) {
        toast.info(t("noChanges"));
        onOpenChange(false);
        return;
      }

      const responses = await Promise.all(requests);

      if (responses.every((res) => res.ok)) {
        toast.success(t("savedCount", { count: requests.length }));
        router.refresh();
        onOpenChange(false);
      } else {
        toast.error(tCommon("error"));
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error(tCommon("error"));
    } finally {
      setIsLoading(false);
    }
  };

  const numberLocale = locale === "ru" ? "ru-RU" : "uz-UZ";

  const formatNumber = (value: string) => {
    const number = value.replace(/\D/g, "");
    return new Intl.NumberFormat(numberLocale).format(Number(number));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="debt_limit">{t("debtLimit", { currency: tCommon("som") })}</Label>
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
              {t("currentLimit", { amount: formatNumber(debtLimit), currency: tCommon("som") })}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="overdue_days">{t("overdueDays")}</Label>
            <Input
              id="overdue_days"
              type="number"
              min={1}
              value={overdueDays}
              onChange={(e) => setOverdueDays(e.target.value.replace(/\D/g, ""))}
              placeholder="45"
              required
            />
            <p className="text-muted-foreground text-sm">{t("currentOverdue", { days: overdueDays })}</p>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? tCommon("saving") : tCommon("save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
