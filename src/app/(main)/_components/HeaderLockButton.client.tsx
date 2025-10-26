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
      className="inline-flex items-center rounded border bg-white px-3 py-1 text-sm"
    >
      <Lock />
    </Button>
  );
}
