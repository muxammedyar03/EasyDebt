"use client";

import * as React from "react";
import { ColumnDef, Row } from "@tanstack/react-table";
import { EllipsisVertical, Minus, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { DataTableColumnHeader } from "../../../../../components/data-table/data-table-column-header";

import { Debtor } from "@/types/types";
import { AddDebtDialog } from "./add-debt-dialog";
import { AddPaymentDialog } from "./add-payment-dialog";
import { EditDebtorDialog } from "./edit-debtor-dialog";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface ColumnsContext {
  onDataChange?: () => void;
  onRowClick?: (debtorId: number) => void;
  debtLimit?: number;
}

// Cell component for first name with router
const FirstNameCell = ({ row }: { row: Row<Debtor> }) => {
  const router = useRouter();
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        router.push(`/dashboard/default/debitor/${row.original.id}`);
      }}
      className="cursor-pointer text-base font-semibold"
    >
      {row.original.first_name}
    </div>
  );
};

// Cell component for action buttons
const ActionButtonsCell = ({ row, context }: { row: Row<Debtor>; context?: ColumnsContext }) => {
  const [debtDialogOpen, setDebtDialogOpen] = React.useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = React.useState(false);

  return (
    <>
      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
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
        debtorName={`${row.original.first_name} ${row.original.last_name}`}
        onSuccess={context?.onDataChange}
      />

      <AddPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        debtorId={row.original.id}
        debtorName={`${row.original.first_name} ${row.original.last_name}`}
        onSuccess={context?.onDataChange}
      />
    </>
  );
};

// Cell component for dropdown actions
const DropdownActionsCell = ({ row, context }: { row: Row<Debtor>; context?: ColumnsContext }) => {
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm(`${row.original.first_name} ${row.original.last_name} ni o&apos;chirishni xohlaysizmi?`)) {
      return;
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

      router.refresh();
    } catch (error) {
      console.error("Error deleting debtor:", error);
      toast.error(error instanceof Error ? error.message : "Qarzdorni o&apos;chirishda xatolik yuz berdi");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div onClick={(e) => e.stopPropagation()}>
            <Button
              variant="outline"
              className="hover:border-input hover:bg-input data-[state=open]:bg-muted text-muted-foreground flex size-8 hover:border"
              size="icon"
              disabled={isDeleting}
            >
              <EllipsisVertical />
              <span className="sr-only">Open menu</span>
            </Button>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32">
          <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>O&apos;zgartirish</DropdownMenuItem>
          <DropdownMenuItem onClick={handleDelete} className="text-destructive" disabled={isDeleting}>
            {isDeleting ? "O'chirilmoqda..." : "O'chirish"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditDebtorDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        debtor={row.original}
        onSuccess={context?.onDataChange}
      />
    </>
  );
};

export const createDashboardColumns = (context?: ColumnsContext): ColumnDef<Debtor>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "index",
    header: ({ column }) => <DataTableColumnHeader className="w-5" column={column} title="№" />,
    cell: ({ row }) => <div>{row.index + 1}</div>,
    enableSorting: true,
  },
  {
    accessorKey: "first_name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Qarzdor" />,
    cell: ({ row }) => <FirstNameCell row={row} />,
    enableSorting: true,
  },
  {
    accessorKey: "phone_number",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Telefon" />,
    cell: ({ row }) => (
      <div className="w-32">
        <Badge variant="outline" className="text-muted-foreground px-1.5">
          {row.original.phone_number || "—"}
        </Badge>
      </div>
    ),
    enableSorting: false,
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
  },
  {
    accessorKey: "total_debt",
    header: ({ column }) => (
      <DataTableColumnHeader className="w-full text-right" column={column} title="Qarz miqdori" />
    ),
    cell: ({ row }) => (
      <div className="text-base font-semibold">{row.original.total_debt.toLocaleString()} so&apos;m</div>
    ),
    enableSorting: true,
  },
  {
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => {
      const debtLimit = context?.debtLimit || 2000000;
      const totalDebt = row.original.total_debt;

      let variant: "default" | "destructive" | "secondary" = "secondary";
      let label = "Qarzdor";

      if (totalDebt <= 0) {
        variant = "default";
        label = "To'langan";
      } else if (totalDebt > debtLimit) {
        variant = "destructive";
        label = "Limitdan oshgan";
      }

      return <Badge variant={variant}>{label}</Badge>;
    },
    enableSorting: false,
  },
  {
    id: "actions-buttons",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Amallar" />,
    cell: ({ row }) => <ActionButtonsCell row={row} context={context} />,
    enableSorting: false,
  },
  {
    id: "actions",
    cell: ({ row }) => <DropdownActionsCell row={row} context={context} />,
    enableSorting: false,
  },
];

// Backward compatibility
export const dashboardColumns = createDashboardColumns();
