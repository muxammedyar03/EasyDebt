"use client";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import React from "react";

export default function HeaderLockButton() {
  const open = () => {
    window.dispatchEvent(new Event("openPinGate"));
  };

  return (
    <Button
      onClick={open}
      variant="outline"
      title="Lock / Open PIN gate"
      className="inline-flex h-12 w-12 items-center border bg-white"
    >
      <Lock className="!h-5 !w-5" />
    </Button>
  );
}
