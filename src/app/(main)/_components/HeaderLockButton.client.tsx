"use client";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import React from "react";

export default function HeaderLockButton() {
  const open = () => {
    window.dispatchEvent(new Event("openPinGate"));
  };

  return (
    <Button onClick={open} variant="outline" size="icon" title="Lock / Open PIN gate" className="size-10">
      <Lock />
    </Button>
  );
}
