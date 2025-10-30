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
      className="inline-flex h-10 items-center border bg-white md:h-12 md:w-12"
    >
      <Lock className="md:!h-5 md:!w-5" />
    </Button>
  );
}
