"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import type { PinGateViewProps } from "@/app/(main)/_components/pin-gate/PinGateView";
import { isFourDigitPin, onlyDigits } from "@/lib/pin-utils";

export function getPinGateStorageKey(scope: string) {
  return `pin_gate_unlocked_${scope}`;
}

type UsePinGateOptions = {
  userId?: number;
  pinLength?: number;
  locked: boolean;
  onUnlock?: () => void;
};

export function usePinGate({ userId, pinLength = 4, locked, onUnlock }: UsePinGateOptions) {
  const t = useTranslations("pinGate");
  const tCommon = useTranslations("common");
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [credentials, setCredentials] = useState({ login: "", password: "" });
  const [pinInputKey, setPinInputKey] = useState(0);

  const resetSensitiveFields = useCallback(() => {
    setPin("");
    setPinConfirm("");
    setCredentials({ login: "", password: "" });
    setResetMode(false);
    setMsg(null);
    setPinInputKey((k) => k + 1);
  }, []);

  const clearPinOnly = useCallback(() => {
    setPin("");
    setPinConfirm("");
    setPinInputKey((k) => k + 1);
  }, []);

  useEffect(() => {
    resetSensitiveFields();

    if (!locked) {
      setHasPin(null);
      return;
    }

    if (!userId) {
      setHasPin(null);
      return;
    }

    fetch(`/api/users/${userId}`)
      .then((r) => r.json())
      .then((data) => setHasPin(Boolean(data?.has_pin)))
      .catch(() => setHasPin(false));
  }, [userId, locked, resetSensitiveFields]);

  const handleSetPin = useCallback(async () => {
    if (!userId || loading) return;
    setMsg(null);
    if (!isFourDigitPin(pin)) return setMsg(t("pinMustBeDigits", { length: pinLength }));
    if (pin !== pinConfirm) return setMsg(t("pinMismatch"));
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_pin", pin }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        onUnlock?.();
      } else {
        clearPinOnly();
        setMsg(data?.error || tCommon("error"));
      }
    } catch {
      clearPinOnly();
      setMsg(t("pinWrong"));
    } finally {
      setLoading(false);
    }
  }, [userId, pin, pinConfirm, pinLength, onUnlock, loading, clearPinOnly, t, tCommon]);

  const handleVerify = useCallback(async () => {
    if (!userId || loading) return;
    setMsg(null);
    if (!isFourDigitPin(pin)) return setMsg(t("pinMustBeDigits", { length: pinLength }));
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify_pin", pin }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        onUnlock?.();
      } else {
        clearPinOnly();
        setMsg(data?.error || t("pinWrong"));
      }
    } catch {
      clearPinOnly();
      setMsg(t("pinWrong"));
    } finally {
      setLoading(false);
    }
  }, [userId, pin, pinLength, onUnlock, loading, clearPinOnly, t]);

  const handleReset = useCallback(async () => {
    if (!userId || loading) return;
    setMsg(null);
    if (!credentials.login || !credentials.password) return setMsg(t("enterLoginPassword"));
    if (!isFourDigitPin(pin)) return setMsg(t("newPinMustBeDigits", { length: pinLength }));
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reset_pin",
          login: credentials.login,
          password: credentials.password,
          pin,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        onUnlock?.();
        setResetMode(false);
        setMsg(t("pinResetSuccess"));
      } else {
        setMsg(data?.error || tCommon("error"));
      }
    } catch {
      clearPinOnly();
      setMsg(t("pinWrong"));
    } finally {
      setLoading(false);
    }
  }, [userId, credentials, pin, pinLength, onUnlock, loading, t, tCommon, clearPinOnly]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      if (!hasPin && isFourDigitPin(pin) && pin === pinConfirm) {
        void handleSetPin();
      } else if (hasPin && !resetMode && isFourDigitPin(pin)) {
        void handleVerify();
      } else if (resetMode && credentials.login && credentials.password && isFourDigitPin(pin)) {
        void handleReset();
      }
    },
    [hasPin, pin, pinConfirm, resetMode, credentials, handleSetPin, handleVerify, handleReset],
  );

  const viewProps: PinGateViewProps = {
    hasPin,
    pinLength,
    locked,
    msg,
    loading,
    resetMode,
    credentials,
    pin,
    pinConfirm,
    pinInputKey,
    onKeyDown: handleKeyDown,
    onPinChange: (v) => setPin(onlyDigits(v, pinLength)),
    onPinConfirmChange: (v) => setPinConfirm(onlyDigits(v, pinLength)),
    onCredentialsChange: (field, value) => setCredentials((s) => ({ ...s, [field]: value })),
    onSetPin: () => void handleSetPin(),
    onVerify: () => void handleVerify(),
    onReset: () => void handleReset(),
    setResetMode: (value: boolean) => {
      if (value) clearPinOnly();
      setResetMode(value);
    },
  };

  return { viewProps };
}
