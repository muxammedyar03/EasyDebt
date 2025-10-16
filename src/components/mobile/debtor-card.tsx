"use client";

import * as React from "react";
import { Phone, MapPin, Plus, DollarSign, MoreVertical } from "lucide-react";
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

interface DebtorCardProps {
  debtor: {
    id: number;
    first_name: string;
    last_name: string;
    phone_number: string | null;
    address: string | null;
    total_debt: number;
    is_overdue: boolean;
    created_at: Date;
  };
  debtLimit: number;
  onAddDebt: (debtorId: number) => void;
  onAddPayment: (debtorId: number) => void;
  onDelete: (debtorId: number) => void;
}

export function DebtorCard({ debtor, debtLimit, onAddDebt, onAddPayment, onDelete }: DebtorCardProps) {
  const router = useRouter();

  const getDebtorStatus = (totalDebt: number, isOverdue: boolean) => {
    if (totalDebt <= 0) {
      return { label: "To'langan", variant: "default" as const, color: "text-green-600" };
    } else if (isOverdue) {
      return { label: "Muddati o'tgan", variant: "destructive" as const, color: "text-red-600" };
    } else if (totalDebt > debtLimit) {
      return { label: "Limitdan oshgan", variant: "destructive" as const, color: "text-red-600" };
    } else {
      return { label: "Qarzdor", variant: "secondary" as const, color: "text-yellow-600" };
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("uz-UZ").format(amount) + " so'm";
  };

  const status = getDebtorStatus(debtor.total_debt, debtor.is_overdue);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3
                className="cursor-pointer text-lg font-semibold hover:underline"
                onClick={() => router.push(`/dashboard/default/debitor/${debtor.id}`)}
              >
                {debtor.first_name} {debtor.last_name}
              </h3>
              <Badge variant={status.variant} className="text-xs">
                {status.label}
              </Badge>
            </div>

            <div className="mt-2 space-y-1">
              {debtor.phone_number && (
                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                  <Phone className="h-3.5 w-3.5" />
                  <a href={`tel:${debtor.phone_number}`} className="hover:underline">
                    {debtor.phone_number}
                  </a>
                </div>
              )}
              {debtor.address && (
                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                  <MapPin className="h-3.5 w-3.5" />
                  <span className="line-clamp-1">{debtor.address}</span>
                </div>
              )}
            </div>

            <div className={`mt-3 text-xl font-bold ${status.color}`}>{formatCurrency(debtor.total_debt)}</div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/dashboard/default/debitor/${debtor.id}`)}>
                Ko&apos;rish
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(debtor.id)} className="text-red-600">
                O&apos;chirish
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-4 flex gap-2">
          <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={() => onAddDebt(debtor.id)}>
            <Plus className="h-4 w-4" />
            Qarz
          </Button>
          <Button size="sm" className="flex-1 gap-1.5" onClick={() => onAddPayment(debtor.id)}>
            <DollarSign className="h-4 w-4" />
            To&apos;lov
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
