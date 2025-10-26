"use client";
import React, { useEffect, useState } from "react";
import { isFourDigitPin, onlyDigits } from "@/lib/pin-utils";
import { PinGateView } from "@/app/(main)/_components/pin-gate/PinGateView";

export default function PinGate({ userId, pinLength = 4 }: { userId?: number; pinLength?: number }) {
  const [locked, setLocked] = useState(false);
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
      .then((data) => {
        setHasPin(Boolean(data?.has_pin));
      })
      .catch(() => setHasPin(false));
  }, [userId, locked]);

  useEffect(() => {
    const openHandler = () => {
      setMsg(null);
      setPin("");
      setPinConfirm("");
      setResetMode(false);
      setLocked(true);
    };
    const closeHandler = () => setLocked(false);
    window.addEventListener("openPinGate", openHandler);
    window.addEventListener("closePinGate", closeHandler);
    return () => {
      window.removeEventListener("openPinGate", openHandler);
      window.removeEventListener("closePinGate", closeHandler);
    };
  }, []);

  // Initialize default lock behavior from cookie (locked/unlocked)
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (locked) return; // don't override if already locked by event
    const match = document.cookie.match(/(?:^|; )pin_gate_default=([^;]+)/);
    const cookieVal = match ? decodeURIComponent(match[1]) : "";
    if (cookieVal === "locked" && userId) {
      // mimic open behavior
      setMsg(null);
      setPin("");
      setPinConfirm("");
      setResetMode(false);
      setLocked(true);
    }
  }, [userId, locked]);

  const handleSetPin = async () => {
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
      setLocked(false);
    } else {
      setMsg(data?.error || "Xato");
    }
  };

  const handleVerify = async () => {
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
      setLocked(false);
    } else {
      setMsg(data?.error || "Pin noto'g'ri");
    }
  };

  const handleReset = async () => {
    setMsg(null);
    if (!credentials.login || !credentials.password) return setMsg("Login va parol kiriting");
    if (!isFourDigitPin(pin)) return setMsg(`Yangi pin ${pinLength} raqam bo'lishi kerak`);
    setLoading(true);
    const res = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset_pin", login: credentials.login, password: credentials.password, pin }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok && data.ok) {
      setLocked(false);
      setResetMode(false);
      setMsg("Yangi pin o'rnatildi");
    } else {
      setMsg(data?.error || "Xato");
    }
  };

  // Handle Enter key press
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!hasPin && isFourDigitPin(pin) && pin === pinConfirm) {
        handleSetPin();
      } else if (hasPin && !resetMode && isFourDigitPin(pin)) {
        handleVerify();
      } else if (resetMode && credentials.login && credentials.password && isFourDigitPin(pin)) {
        handleReset();
      }
    }
  };

  if (!userId || !locked) return null;
  return (
    <PinGateView
      hasPin={hasPin}
      pinLength={pinLength}
      locked={locked}
      msg={msg}
      loading={loading}
      resetMode={resetMode}
      credentials={credentials}
      pin={pin}
      pinConfirm={pinConfirm}
      onKeyDown={handleKeyDown}
      onPinChange={(v) => setPin(onlyDigits(v, pinLength))}
      onPinConfirmChange={(v) => setPinConfirm(onlyDigits(v, pinLength))}
      onCredentialsChange={(field, value) => setCredentials((s) => ({ ...s, [field]: value }))}
      onSetPin={handleSetPin}
      onVerify={handleVerify}
      onReset={handleReset}
      setResetMode={setResetMode}
    />
  );
}
