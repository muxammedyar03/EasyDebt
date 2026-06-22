"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { t } from "@/lib/i18n";

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
    setOverdueDays(initialOverdueDays.toString());
  }, [initialDebtLimit, initialOverdueDays]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (process.env.NODE_ENV === "production") {
      toast.error(t("settings.demoLocked"));
      return;
    }
    setIsLoading(true);

    try {
      const requests = [];

      if (debtLimit !== initialDebtLimit.toString()) {
        requests.push(
          fetch("/api/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key: "debt_limit", value: debtLimit }),
          }),
        );
      }

      if (overdueDays !== initialOverdueDays.toString()) {
        requests.push(
          fetch("/api/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key: "overdue_days", value: overdueDays }),
          }),
        );
      }

      if (requests.length === 0) {
        toast.info(t("settings.noChanges"));
        onOpenChange(false);
        return;
      }

      const responses = await Promise.all(requests);

      if (responses.every((res) => res.ok)) {
        toast.success(t("settings.saved"));
        router.refresh();
        onOpenChange(false);
      } else {
        toast.error(t("settings.error"));
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error(t("settings.error"));
    } finally {
      setIsLoading(false);
    }
  };

  const formatNumber = (value: string) => {
    const number = value.replace(/\D/g, "");
    return new Intl.NumberFormat("ru-RU").format(Number(number));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("settings.title")}</DialogTitle>
          <DialogDescription>{t("settings.description")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="debt_limit">{t("settings.debtLimit")}</Label>
            <Input
              id="debt_limit"
              type="text"
              value={formatNumber(debtLimit)}
              onChange={(e) => setDebtLimit(e.target.value.replace(/\D/g, ""))}
              placeholder="2000000"
              required
            />
            <p className="text-muted-foreground text-sm">
              {t("settings.currentLimit")}: {formatNumber(debtLimit)} {t("settings.currency")}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="overdue_days">{t("settings.overdueDays")}</Label>
            <Input
              id="overdue_days"
              type="number"
              min={1}
              value={overdueDays}
              onChange={(e) => setOverdueDays(e.target.value.replace(/\D/g, ""))}
              placeholder="45"
              required
            />
            <p className="text-muted-foreground text-sm">
              {t("settings.currentDays")}: {overdueDays} {t("settings.days")}
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("settings.cancel")}
            </Button>
            <Button type="submit" disabled={isLoading || process.env.NODE_ENV === "production"}>
              {isLoading ? t("settings.saving") : t("settings.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
