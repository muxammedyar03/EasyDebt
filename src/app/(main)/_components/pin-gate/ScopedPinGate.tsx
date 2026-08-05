"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import { PinGateView } from "@/app/(main)/_components/pin-gate/PinGateView";
import { getPinGateStorageKey, usePinGate } from "@/hooks/use-pin-gate";

type Props = {
  userId: number;
  /** Unique scope for session persistence, e.g. "my-debts", "reports" */
  scope: string;
  pinLength?: number;
  children: React.ReactNode;
  /** Clear unlock state when leaving this section (default: true) */
  clearOnUnmount?: boolean;
};

export function ScopedPinGate({ userId, scope, pinLength = 4, children, clearOnUnmount = true }: Props) {
  const storageKey = getPinGateStorageKey(scope);
  const [ready, setReady] = React.useState(false);
  const [locked, setLocked] = React.useState(true);

  React.useEffect(() => {
    const unlocked = sessionStorage.getItem(storageKey) === "1";
    setLocked(!unlocked);
    setReady(true);

    return () => {
      if (clearOnUnmount) {
        sessionStorage.removeItem(storageKey);
      }
    };
  }, [storageKey, clearOnUnmount]);

  const { viewProps } = usePinGate({
    userId,
    pinLength,
    locked,
    onUnlock: () => {
      sessionStorage.setItem(storageKey, "1");
      setLocked(false);
    },
  });

  if (!ready) {
    return (
      <div className="text-muted-foreground flex min-h-[40vh] items-center justify-center gap-2 text-sm">
        <Loader2 className="h-5 w-5 animate-spin" />
        Yuklanmoqda...
      </div>
    );
  }

  if (!locked) {
    return <>{children}</>;
  }

  return <PinGateView {...viewProps} />;
}
