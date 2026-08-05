"use client";

import { useCallback, useEffect, useState } from "react";

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
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [credentials, setCredentials] = useState({ login: "", password: "" });

  useEffect(() => {
    if (!userId || !locked) {
      setHasPin(null);
      return;
    }
    fetch(`/api/users/${userId}`)
      .then((r) => r.json())
      .then((data) => setHasPin(Boolean(data?.has_pin)))
      .catch(() => setHasPin(false));
  }, [userId, locked]);

  const handleSetPin = useCallback(async () => {
    if (!userId) return;
    setMsg(null);
    if (!isFourDigitPin(pin)) return setMsg(`Pin ${pinLength} raqam bo'lishi kerak`);
    if (pin !== pinConfirm) return setMsg("Pin tasdiqlanmadi");
    setLoading(true);
    const res = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_pin", pin }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok && data.ok) {
      onUnlock?.();
    } else {
      setMsg(data?.error || "Xato");
    }
  }, [userId, pin, pinConfirm, pinLength, onUnlock]);

  const handleVerify = useCallback(async () => {
    if (!userId) return;
    setMsg(null);
    if (!isFourDigitPin(pin)) return setMsg(`Pin ${pinLength} raqam bo'lishi kerak`);
    setLoading(true);
    const res = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verify_pin", pin }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok && data.ok) {
      onUnlock?.();
    } else {
      setMsg(data?.error || "Pin noto'g'ri");
    }
  }, [userId, pin, pinLength, onUnlock]);

  const handleReset = useCallback(async () => {
    if (!userId) return;
    setMsg(null);
    if (!credentials.login || !credentials.password) return setMsg("Login va parol kiriting");
    if (!isFourDigitPin(pin)) return setMsg(`Yangi pin ${pinLength} raqam bo'lishi kerak`);
    setLoading(true);
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
    setLoading(false);
    if (res.ok && data.ok) {
      onUnlock?.();
      setResetMode(false);
      setMsg("Yangi pin o'rnatildi");
    } else {
      setMsg(data?.error || "Xato");
    }
  }, [userId, credentials, pin, pinLength, onUnlock]);

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
    onKeyDown: handleKeyDown,
    onPinChange: (v) => setPin(onlyDigits(v, pinLength)),
    onPinConfirmChange: (v) => setPinConfirm(onlyDigits(v, pinLength)),
    onCredentialsChange: (field, value) => setCredentials((s) => ({ ...s, [field]: value })),
    onSetPin: () => void handleSetPin(),
    onVerify: () => void handleVerify(),
    onReset: () => void handleReset(),
    setResetMode,
  };

  return { viewProps };
}
