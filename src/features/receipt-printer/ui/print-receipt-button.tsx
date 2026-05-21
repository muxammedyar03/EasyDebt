"use client";

/**
 * RECEIPT PRINTER — Print Receipt Button
 *
 * Qayta foydalaniladigan chek chiqarish button.
 * History table larda har bir qator uchun ishlatiladi.
 */

import * as React from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PrintReceiptButtonProps {
  onClick: () => void;
  size?: "sm" | "icon" | "default";
  variant?: "ghost" | "outline" | "default";
  label?: string;
  className?: string;
}

export function PrintReceiptButton({
  onClick,
  size = "sm",
  variant = "ghost",
  label,
  className,
}: PrintReceiptButtonProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant={variant} size={size} onClick={onClick} className={className}>
            <Printer className="h-4 w-4" />
            {label && <span className="ml-1">{label}</span>}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Chek chiqarish</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
