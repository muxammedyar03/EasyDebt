"use client";

import * as React from "react";
import { Bell, Calendar, Clock, Loader2, Trash2, CheckCircle2, BellOff } from "lucide-react";
import { format } from "date-fns";
import { ru, uz } from "date-fns/locale";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { REMINDER_STATUS_BADGES } from "@/types/view/payment-reminder.view";
import type { PaymentReminderDomain } from "@/types/domain/payment-reminder.domain";
import { Input } from "@/components/ui/input";

interface PaymentReminderFormState {
  date: Date | undefined;
  time: string;
  note: string;
}

interface PaymentReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debtorId: number;
  debtorName: string;
  activeReminder: PaymentReminderDomain | null;
  formState: PaymentReminderFormState;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  setFormDate: (date: Date | undefined) => void;
  setFormTime: (time: string) => void;
  setFormNote: (note: string) => void;
  submitReminder: () => Promise<boolean>;
  cancelReminder: (reminderId: number) => Promise<boolean>;
  completeReminder: (reminderId: number) => Promise<boolean>;
  deleteReminder: (reminderId: number) => Promise<boolean>;
  onSuccess?: () => void;
}

const STATUS_KEYS = {
  PENDING: "reminderStatusPending",
  NOTIFIED: "reminderStatusNotified",
  COMPLETED: "reminderStatusCompleted",
  CANCELLED: "reminderStatusCancelled",
} as const;

export function PaymentReminderDialog({
  open,
  onOpenChange,
  debtorName,
  activeReminder,
  formState,
  isLoading,
  isSubmitting,
  error,
  setFormDate,
  setFormTime,
  setFormNote,
  submitReminder,
  cancelReminder,
  completeReminder,
  deleteReminder,
  onSuccess,
}: PaymentReminderDialogProps) {
  const t = useTranslations("debtor");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const dateLocale = locale === "ru" ? ru : uz;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await submitReminder();
    if (success) {
      toast.success(activeReminder ? t("reminderUpdated") : t("reminderCreated"));
      onSuccess?.();
      onOpenChange(false);
    }
  };

  const handleCancel = async () => {
    if (!activeReminder) return;
    const confirmed = window.confirm(t("reminderConfirmCancel"));
    if (confirmed) {
      const success = await cancelReminder(activeReminder.id);
      if (success) {
        toast.success(t("reminderCancelled"));
        onSuccess?.();
      }
    }
  };

  const handleComplete = async () => {
    if (!activeReminder) return;
    const success = await completeReminder(activeReminder.id);
    if (success) {
      toast.success(t("reminderCompleted"));
      onSuccess?.();
    }
  };

  const handleDelete = async () => {
    if (!activeReminder) return;
    const confirmed = window.confirm(t("reminderConfirmDelete"));
    if (confirmed) {
      const success = await deleteReminder(activeReminder.id);
      if (success) {
        toast.success(t("reminderDeleted"));
        onSuccess?.();
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] !max-w-[40rem]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t("reminderTitle")}
          </DialogTitle>
          <DialogDescription>{t("reminderDescription", { name: debtorName })}</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : activeReminder?.status === "NOTIFIED" ? (
          <div className="py-4">
            <div className="rounded-lg border border-purple-500/30 bg-purple-500/10 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/20">
                  <Bell className="h-5 w-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{t("reminderSent")}</span>
                    <Badge className="border-purple-500/20 bg-purple-500/10 text-purple-700">
                      {t("reminderStatusNotified")}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {format(new Date(activeReminder.reminderAt), "d-MMMM yyyy, HH:mm", {
                      locale: dateLocale,
                    })}
                  </p>
                  {activeReminder.note && <p className="text-muted-foreground mt-1 text-sm">{activeReminder.note}</p>}
                </div>
              </div>
            </div>

            <p className="text-muted-foreground mt-4 text-center text-sm">{t("reminderNotifiedHint")}</p>

            <div className="mt-6 grid gap-2 sm:grid-cols-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleComplete}
                disabled={isSubmitting}
                className="h-9 border border-green-600/30 bg-green-600/10 text-green-600 hover:bg-green-600/20 hover:text-green-700"
              >
                <CheckCircle2 className="mr-1 h-4 w-4" />
                {t("reminderComplete")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={isSubmitting}
                className="h-9 border border-yellow-600/30 bg-yellow-600/10 text-yellow-600 hover:bg-yellow-600/20 hover:text-yellow-700"
              >
                <BellOff className="mr-1 h-4 w-4" />
                {tCommon("cancel")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="text-destructive hover:text-destructive h-9 border border-red-600/30 bg-red-600/10 hover:bg-red-600/20"
              >
                <Trash2 className="mr-1 h-4 w-4" />
                {tCommon("delete")}
              </Button>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="mt-4 h-9 w-full"
            >
              {tCommon("close")}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {activeReminder && (
              <div className="bg-muted/50 mb-4 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{t("reminderActive")}</span>
                  <Badge className={cn(REMINDER_STATUS_BADGES[activeReminder.status].color)}>
                    {t(STATUS_KEYS[activeReminder.status])}
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-1 text-sm">
                  {format(new Date(activeReminder.reminderAt), "d-MMMM yyyy, HH:mm", {
                    locale: dateLocale,
                  })}
                </p>
                {activeReminder.note && <p className="mt-1 text-sm">{activeReminder.note}</p>}
              </div>
            )}

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="date" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {tCommon("date")} <span className="text-destructive">*</span>
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "h-9 justify-start text-left font-normal",
                        !formState.date && "text-muted-foreground",
                      )}
                      disabled={isSubmitting}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {formState.date
                        ? format(formState.date, "d-MMMM yyyy", { locale: dateLocale })
                        : tCommon("pickDate")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={formState.date}
                      onSelect={setFormDate}
                      initialFocus
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="time" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {tCommon("time")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="time"
                  type="time"
                  placeholder={tCommon("pickTime")}
                  value={formState.time}
                  onChange={(e) => setFormTime(e.target.value)}
                  disabled={isSubmitting}
                  className="border-border h-9 border"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="note">{tCommon("noteOptional")}</Label>
                <Textarea
                  id="note"
                  placeholder={t("reminderNotePlaceholder")}
                  value={formState.note}
                  onChange={(e) => setFormNote(e.target.value)}
                  disabled={isSubmitting}
                  rows={3}
                  className="border-border h-9 border"
                />
              </div>

              {error && <p className="text-destructive text-sm">{error}</p>}
            </div>

            <DialogFooter>
              <div className="flex w-full flex-col gap-2 space-y-4 pt-4">
                {activeReminder && (
                  <div className="grid w-full gap-2 sm:grid-cols-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleComplete}
                      disabled={isSubmitting}
                      className="h-9 border border-green-600/30 bg-green-600/10 text-green-600 hover:bg-green-600/10 hover:text-green-700 dark:border-green-500/15 dark:bg-green-500/10 dark:hover:bg-green-600/20"
                    >
                      <CheckCircle2 className="mr-1 h-4 w-4" />
                      {t("reminderComplete")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCancel}
                      disabled={isSubmitting}
                      className="h-9 border border-yellow-600/30 bg-yellow-600/10 text-yellow-600 hover:bg-yellow-600/10 hover:text-yellow-700 dark:border-yellow-500/15 dark:bg-yellow-500/10 dark:hover:bg-yellow-600/20"
                    >
                      <BellOff className="mr-1 h-4 w-4" />
                      {tCommon("cancel")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDelete}
                      disabled={isSubmitting}
                      className="text-destructive hover:text-destructive h-9 border border-red-600/30 bg-red-600/10 hover:bg-red-600/10 dark:border-red-500/15 dark:bg-red-500/10 dark:hover:bg-red-600/20"
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      {tCommon("delete")}
                    </Button>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={isSubmitting}
                    className="h-9"
                  >
                    {tCommon("close")}
                  </Button>
                  <Button type="submit" disabled={isSubmitting || !formState.date} className="h-9">
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {activeReminder ? tCommon("update") : tCommon("save")}
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
