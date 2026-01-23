"use client";

import * as React from "react";
import { ColumnDef, Row } from "@tanstack/react-table";
import { EllipsisVertical, Minus, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { DataTableColumnHeader } from "../../../../../components/data-table/data-table-column-header";

import { AddDebtDialog } from "./add-debt-dialog";
import { AddPaymentDialog } from "./add-payment-dialog";
import { EditDebtorDialog } from "./edit-debtor-dialog";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DebtorView } from "@/types/view";

interface ColumnsContext {
  onDataChange?: () => void;
  debtLimit?: number;
}

const FirstNameCell = ({ row }: { row: Row<DebtorView> }) => {
  const router = useRouter();
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        router.push(`/dashboard/default/debitor/${row.original.id}`);
      }}
      className="cursor-pointer text-base font-semibold"
    >
      {row.original.firstName}
    </div>
  );
};

// Cell component for action buttons
const ActionButtonsCell = ({ row, context }: { row: Row<DebtorView>; context?: ColumnsContext }) => {
  const [debtDialogOpen, setDebtDialogOpen] = React.useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = React.useState(false);

  return (
    <>
      <div
        className="flex gap-2"
        onClick={(e) => e.stopPropagation()}
        onPointerDownCapture={(e) => e.stopPropagation()}
        onMouseDownCapture={(e) => e.stopPropagation()}
        onMouseUpCapture={(e) => e.stopPropagation()}
      >
        <Button variant="outline" size="sm" onClick={() => setDebtDialogOpen(true)}>
          <Plus className="h-4 w-4" /> Qarz
        </Button>
        <Button variant="outline" size="sm" onClick={() => setPaymentDialogOpen(true)}>
          <Minus className="h-4 w-4" /> To&apos;lov
        </Button>
      </div>

      <AddDebtDialog
        open={debtDialogOpen}
        onOpenChange={setDebtDialogOpen}
        debtorId={row.original.id}
        debtorName={`${row.original.firstName} ${row.original.lastName}`}
        onSuccess={context?.onDataChange}
      />

      <AddPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        debtorId={row.original.id}
        debtorName={`${row.original.firstName} ${row.original.lastName}`}
        onSuccess={context?.onDataChange}
      />
    </>
  );
};

// Cell component for dropdown actions
const DropdownActionsCell = ({ row, context }: { row: Row<DebtorView>; context?: ColumnsContext }) => {
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const debtorView: DebtorView = {
    id: row.original.id,
    externalId: String(row.original.id),
    fullName: `${row.original.firstName} ${row.original.lastName}`,
    firstName: row.original.firstName,
    lastName: row.original.lastName,
    displayName: `${row.original.firstName} ${row.original.lastName.charAt(0)}.`,
    phoneNumber: row.original.phoneNumber,
    phoneDisplay: row.original.phoneNumber,
    address: row.original.address,
    totalDebt: row.original.totalDebt,
    totalDebtFormatted: `${row.original.totalDebt.toLocaleString()} so'm`,
    isOverdue: row.original.riskStatus === "low",
    lastPaymentDate: null,
    lastPaymentDateFormatted: null,
    riskStatus: "medium",
    riskStatusBadge: {
      label: "Medium",
      variant: "secondary",
      color: "yellow",
    },
    status: "active",
    statusBadge: {
      label: "Active",
      variant: "default",
    },
    daysOverdue: null,
    daysOverdueDisplay: null,
    isHighRisk: false,
    canEdit: true,
    canDelete: true,
    createdAt: row.original.createdAt,
    createdAtFormatted: new Date(row.original.createdAt).toLocaleDateString(),
    updatedAt: row.original.updatedAt,
    updatedAtFormatted: new Date(row.original.updatedAt).toLocaleDateString(),
  };

  const handleDelete = async () => {
    if (!confirm(`${row.original.firstName} ${row.original.lastName} ni o'chirishni xohlaysizmi?`)) {
      return toast.error("Qarzdorni o'chirishni bekor qilindi");
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/debtors/${row.original.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Qarzdorni o&apos;chirishda xatolik yuz berdi");
      }

      toast.success("Qarzdor muvaffaqiyatli o&apos;chirildi");

      if (context?.onDataChange) {
        context.onDataChange();
      }
    } catch (error) {
      console.error("Error deleting debtor:", error);
      toast.error(error instanceof Error ? error.message : "Qarzdorni o'chirishda xatolik yuz berdi");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="hover:border-input hover:bg-input data-[state=open]:bg-muted text-muted-foreground flex size-8 hover:border"
            size="icon"
            disabled={isDeleting}
            onClick={(e) => e.stopPropagation()}
          >
            <EllipsisVertical />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32">
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setEditDialogOpen(true);
            }}
          >
            O&apos;zgartirish
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              await handleDelete();
            }}
            className="text-destructive"
            disabled={isDeleting}
          >
            {isDeleting ? "O'chirilmoqda..." : "O'chirish"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditDebtorDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        debtor={debtorView}
        onSuccess={context?.onDataChange}
      />
    </>
  );
};

export const createDashboardColumns = (context?: ColumnsContext): ColumnDef<DebtorView>[] => [
  {
    accessorKey: "index",
    header: ({ column }) => <DataTableColumnHeader className="w-5" column={column} title="№" />,
    cell: ({ row }) => <div>{row.index + 1}</div>,
    enableSorting: true,
    enableHiding: false,
  },
  {
    accessorKey: "first_name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Qarzdor" />,
    cell: ({ row }) => <FirstNameCell row={row} />,
    enableSorting: true,
    enableHiding: false,
  },
  {
    accessorKey: "phone_number",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Telefon" />,
    cell: ({ row }) => (
      <div className="w-32">
        <Badge variant="outline" className="text-muted-foreground px-1.5">
          {row.original.phoneNumber || "—"}
        </Badge>
      </div>
    ),
    enableSorting: false,
    enableHiding: true,
  },
  {
    accessorKey: "address",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Manzil" />,
    cell: ({ row }) => (
      <Badge variant="outline" className="text-muted-foreground px-1.5">
        {row.original.address || "—"}
      </Badge>
    ),
    enableSorting: false,
    enableHiding: true,
  },
  {
    accessorKey: "total_debt",
    header: ({ column }) => (
      <DataTableColumnHeader className="w-full text-right" column={column} title="Qarz miqdori" />
    ),
    cell: ({ row }) => (
      <div className="text-base font-semibold">{row.original.totalDebt.toLocaleString()} so&apos;m</div>
    ),
    enableSorting: true,
    enableHiding: false,
  },
  {
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => {
      const debtLimit = context?.debtLimit || 2000000;
      const totalDebt = row.original.totalDebt;

      let variant: "default" | "destructive" | "secondary" = "secondary";
      let label = "Qarzdor";

      if (totalDebt <= 0) {
        variant = "default";
        label = "To'langan";
      } else if (totalDebt > debtLimit) {
        variant = "destructive";
        label = "Limitdan oshgan";
      }

      return (
        <div className="flex items-center gap-2">
          <Badge
            variant={"default"}
            className={`h-5 w-5 rounded-full ${row.original.isOverdue ? "bg-red-500" : "bg-green-500"}`}
          ></Badge>
          <Badge variant={variant}>{label}</Badge>
        </div>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: "actions-buttons",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Amallar" />,
    cell: ({ row }) => <ActionButtonsCell row={row} context={context} />,
    enableHiding: false,
  },
  {
    id: "actions",
    cell: ({ row }) => <DropdownActionsCell row={row} context={context} />,
    enableSorting: false,
    enableHiding: false,
  },
];

// Backward compatibility
export const dashboardColumns = createDashboardColumns();
