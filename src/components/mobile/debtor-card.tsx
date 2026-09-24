"use client";

import * as React from "react";
import { Plus, DollarSign, MoreVertical } from "lucide-react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DebtorView } from "@/types/view";
import { formatCurrencyUzs } from "@/lib/format";

interface DebtorCardProps {
  debtor: DebtorView;
  debtLimit: number;
  onAddDebt: (debtorId: number) => void;
  onAddPayment: (debtorId: number) => void;
  onDelete: (debtorId: number) => void;
}

export function DebtorCard({ debtor, debtLimit, onAddDebt, onAddPayment, onDelete }: DebtorCardProps) {
  const router = useRouter();

  const getDebtorStatus = (totalDebt: number, isOverdue: boolean) => {
    if (totalDebt <= 0) {
      return {
        label: "To'langan",
        variant: "default" as const,
        color: "text-green-600",
        className: "bg-green-600/20 text-green-700 dark:text-green-500 p-1 px-2",
      };
    } else if (isOverdue) {
      return {
        label: "Muddati o'tgan",
        variant: "default" as const,
        color: "text-red-600",
        className: "bg-red-600/15 text-red-700 dark:text-red-500 p-1 px-2",
      };
    } else if (totalDebt > debtLimit) {
      return {
        label: "Limitdan oshgan",
        variant: "default" as const,
        color: "text-red-600",
        className: "bg-red-600/15 text-red-700 dark:text-red-500 p-1 px-2",
      };
    } else {
      return {
        label: "Qarzdor",
        variant: "secondary" as const,
        color: "text-yellow-600",
        className: "bg-yellow-600/20 text-yellow-700 dark:text-yellow-500 p-1 px-2",
      };
    }
  };

  const status = getDebtorStatus(debtor.totalDebt, debtor.isOverdue);

  return (
    <Card className="overflow-hidden py-4">
      <CardContent className="px-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-start gap-2">
              <h3
                className="cursor-pointer text-base font-semibold hover:underline"
                onClick={() => router.push(`/dashboard/default/debitor/${debtor.externalId}`)}
              >
                {debtor.firstName} {debtor.lastName}
              </h3>
              <Badge variant={status.variant} className={`mr-2 text-xs ${status.className}`}>
                {status.label}
              </Badge>
            </div>

            {/* <div className="mt-2 space-y-1">
              {debtor.phoneNumber && (
                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                  <Phone className="h-3.5 w-3.5" />
                  <a href={`tel:${debtor.phoneNumber}`} className="hover:underline">
                    {debtor.phoneNumber}
                  </a>
                </div>
              )}
              {debtor.address && (
                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                  <MapPin className="h-3.5 w-3.5" />
                  <span className="line-clamp-1">{debtor.address}</span>
                </div>
              )}
            </div> */}

            <div className={`mt-3 text-xl font-bold ${status.color}`}>{formatCurrencyUzs(debtor.totalDebt)}</div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/dashboard/default/debitor/${debtor.externalId}`)}>
                Ko&apos;rish
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(debtor.id)} className="text-red-600">
                O&apos;chirish
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-4 flex gap-2">
          <Button size="sm" variant="outline" className="h-10 flex-1 gap-1.5" onClick={() => onAddDebt(debtor.id)}>
            <Plus className="h-4 w-4" />
            Qarz
          </Button>
          <Button size="sm" className="h-10 flex-1 gap-1.5" onClick={() => onAddPayment(debtor.id)}>
            <DollarSign className="h-4 w-4" />
            To&apos;lov
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
