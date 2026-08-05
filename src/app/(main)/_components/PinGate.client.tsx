"use client";

import { useEffect, useState } from "react";

import { PinGateView } from "@/app/(main)/_components/pin-gate/PinGateView";
import { usePinGate } from "@/hooks/use-pin-gate";

export default function PinGate({ userId, pinLength = 4 }: { userId?: number; pinLength?: number }) {
  const [locked, setLocked] = useState(false);

  const { viewProps } = usePinGate({
    userId,
    pinLength,
    locked,
    onUnlock: () => setLocked(false),
  });

  useEffect(() => {
    const openHandler = () => {
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

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (locked) return;
    const match = document.cookie.match(/(?:^|; )pin_gate_default=([^;]+)/);
    const cookieVal = match ? decodeURIComponent(match[1]) : "";
    if (cookieVal === "locked" && userId) {
      setLocked(true);
    }
  }, [userId, locked]);

  if (!userId || !locked) return null;

  return <PinGateView {...viewProps} />;
}
