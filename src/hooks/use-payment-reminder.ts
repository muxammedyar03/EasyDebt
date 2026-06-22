"use client";

import * as React from "react";
import type { PaymentReminderDomain } from "@/types/domain/payment-reminder.domain";
import { t } from "@/lib/i18n";

/**
 * Form state for payment reminder dialog
 */
interface PaymentReminderFormState {
  date: Date | undefined;
  time: string;
  note: string;
}

/**
 * Hook state
 */
interface UsePaymentReminderState {
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  activeReminder: PaymentReminderDomain | null;
  allReminders: PaymentReminderDomain[];
  formState: PaymentReminderFormState;
}

/**
 * Hook actions
 */
interface UsePaymentReminderActions {
  setFormDate: (date: Date | undefined) => void;
  setFormTime: (time: string) => void;
  setFormNote: (note: string) => void;
  resetForm: () => void;
  submitReminder: () => Promise<boolean>;
  cancelReminder: (reminderId: number) => Promise<boolean>;
  completeReminder: (reminderId: number) => Promise<boolean>;
  deleteReminder: (reminderId: number) => Promise<boolean>;
  refreshReminders: () => Promise<void>;
}

/**
 * Hook options
 */
interface UsePaymentReminderOptions {
  debtorId: number;
  enabled?: boolean; // Control whether to fetch on mount
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

const initialFormState: PaymentReminderFormState = {
  date: undefined,
  time: "09:00",
  note: "",
};

/**
 * Custom hook for managing payment reminder state and actions
 *
 * Follows clean architecture principles:
 * - Separates state management from UI components
 * - Provides typed actions for all operations
 * - Handles loading and error states
 */
export function usePaymentReminder(
  options: UsePaymentReminderOptions,
): UsePaymentReminderState & UsePaymentReminderActions {
  const { debtorId, enabled = true, onSuccess, onError } = options;

  // Store callbacks in refs to avoid re-creating functions
  const onSuccessRef = React.useRef(onSuccess);
  const onErrorRef = React.useRef(onError);

  React.useEffect(() => {
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
  }, [onSuccess, onError]);

  // State
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [activeReminder, setActiveReminder] = React.useState<PaymentReminderDomain | null>(null);
  const [allReminders, setAllReminders] = React.useState<PaymentReminderDomain[]>([]);
  const [formState, setFormState] = React.useState<PaymentReminderFormState>(initialFormState);

  // Track if initial fetch happened
  const hasFetchedRef = React.useRef(false);

  // Fetch reminders for this debtor
  const refreshReminders = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/payment-reminders?debtor_id=${debtorId}`);
      if (!response.ok) {
        throw new Error("Eslatmalarni yuklashda xatolik");
      }

      const data = await response.json();
      const reminders = data.data || [];
      setAllReminders(reminders);

      // Find active reminder (PENDING or NOTIFIED - user must manually complete/cancel)
      const active = reminders.find((r: PaymentReminderDomain) => r.status === "PENDING" || r.status === "NOTIFIED");
      setActiveReminder(active || null);

      // If there's an active reminder, pre-fill the form
      if (active) {
        const reminderDate = new Date(active.reminderAt);
        setFormState({
          date: reminderDate,
          time: `${String(reminderDate.getHours()).padStart(2, "0")}:${String(reminderDate.getMinutes()).padStart(
            2,
            "0",
          )}`,
          note: active.note || "",
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Xatolik yuz berdi";
      setError(message);
      onErrorRef.current?.(message);
    } finally {
      setIsLoading(false);
    }
  }, [debtorId]);

  // Initial load - only once when enabled
  React.useEffect(() => {
    if (enabled && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      refreshReminders();
    }
  }, [enabled, refreshReminders]);

  // Form actions
  const setFormDate = React.useCallback((date: Date | undefined) => {
    setFormState((prev) => ({ ...prev, date }));
  }, []);

  const setFormTime = React.useCallback((time: string) => {
    setFormState((prev) => ({ ...prev, time }));
  }, []);

  const setFormNote = React.useCallback((note: string) => {
    setFormState((prev) => ({ ...prev, note }));
  }, []);

  const resetForm = React.useCallback(() => {
    setFormState(initialFormState);
  }, []);

  // Submit reminder (create or update)
  const submitReminder = React.useCallback(async (): Promise<boolean> => {
    if (!formState.date) {
      setError("Sana tanlanmagan");
      onErrorRef.current?.("Sana tanlanmagan");
      return false;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // Combine date and time
      const [hours, minutes] = formState.time.split(":").map(Number);
      const reminderAt = new Date(formState.date);
      reminderAt.setHours(hours, minutes, 0, 0);

      // Check if reminder is in the past
      if (reminderAt < new Date()) {
        setError("Eslatma vaqti o'tmishda bo'lishi mumkin emas");
        onErrorRef.current?.("Eslatma vaqti o'tmishda bo'lishi mumkin emas");
        return false;
      }

      const method = activeReminder ? "PATCH" : "POST";
      const url = activeReminder ? `/api/payment-reminders/${activeReminder.id}` : "/api/payment-reminders";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          debtor_id: debtorId,
          reminder_at: reminderAt.toISOString(),
          note: formState.note || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Eslatmani saqlashda xatolik");
      }

      await refreshReminders();
      onSuccessRef.current?.();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Xatolik yuz berdi";
      setError(message);
      onErrorRef.current?.(message);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [formState, activeReminder, debtorId, refreshReminders]);

  // Cancel reminder
  const cancelReminder = React.useCallback(
    async (reminderId: number): Promise<boolean> => {
      try {
        setIsSubmitting(true);
        setError(null);

        const response = await fetch(`/api/payment-reminders/${reminderId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "CANCELLED" }),
        });

        if (!response.ok) {
          throw new Error("Eslatmani bekor qilishda xatolik");
        }

        await refreshReminders();
        resetForm();
        onSuccessRef.current?.();
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Xatolik yuz berdi";
        setError(message);
        onErrorRef.current?.(message);
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [refreshReminders, resetForm],
  );

  // Complete reminder
  const completeReminder = React.useCallback(
    async (reminderId: number): Promise<boolean> => {
      try {
        setIsSubmitting(true);
        setError(null);

        const response = await fetch(`/api/payment-reminders/${reminderId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "COMPLETED" }),
        });

        if (!response.ok) {
          throw new Error("Eslatmani tugallashda xatolik");
        }

        await refreshReminders();
        resetForm();
        onSuccessRef.current?.();
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Xatolik yuz berdi";
        setError(message);
        onErrorRef.current?.(message);
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [refreshReminders, resetForm],
  );

  // Delete reminder
  const deleteReminder = React.useCallback(
    async (reminderId: number): Promise<boolean> => {
      try {
        setIsSubmitting(true);
        setError(null);

        const response = await fetch(`/api/payment-reminders/${reminderId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error(t("paymentReminders.deleteError"));
        }

        await refreshReminders();
        resetForm();
        onSuccessRef.current?.();
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Xatolik yuz berdi";
        setError(message);
        onErrorRef.current?.(message);
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [refreshReminders, resetForm],
  );

  return {
    // State
    isLoading,
    isSubmitting,
    error,
    activeReminder,
    allReminders,
    formState,
    // Actions
    setFormDate,
    setFormTime,
    setFormNote,
    resetForm,
    submitReminder,
    cancelReminder,
    completeReminder,
    deleteReminder,
    refreshReminders,
  };
}
