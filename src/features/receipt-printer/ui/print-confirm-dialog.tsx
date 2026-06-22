"use client";

/**
 * RECEIPT PRINTER — Print Confirm Dialog
 *
 * "Chek chiqarishni xohlaysizmi?" dialog.
 * Qarz yoki to'lov muvaffaqiyatli qo'shilgandan keyin ko'rsatiladi.
 * Chek apparatsiz ham kontentni ko'rish uchun vizual Preview qismi qo'shilgan.
 */

import * as React from "react";
import { Printer } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SingleReceiptPreview } from "./receipt-template";
import type { SingleReceiptData } from "../model/types";

interface PrintConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  receiptData?: SingleReceiptData | null;
}

export function PrintConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title = "Chek chiqarish",
  description = "Chek chiqarishni xohlaysizmi?",
  receiptData,
}: PrintConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {receiptData && (
          <div className="bg-muted/40 my-2 overflow-hidden rounded-md border p-2">
            <p className="text-muted-foreground mb-2 text-center text-xs font-medium">
              Chek ko&apos;rinishi (Preview):
            </p>
            <ScrollArea className="max-h-[300px] w-full rounded-md border bg-white p-1">
              <SingleReceiptPreview data={receiptData} />
            </ScrollArea>
          </div>
        )}

        <DialogFooter className="mt-2 grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Yo&apos;q, yopish
          </Button>
          <Button type="button" onClick={handleConfirm}>
            <Printer className="mr-2 h-4 w-4" />
            Ha, chop etish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
