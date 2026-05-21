"use client";

import * as React from "react";
import { ColumnDef, Row } from "@tanstack/react-table";
import { Bell, Clock, EllipsisVertical, Minus, Plus } from "lucide-react";
import { formatDistanceToNow, isPast, differenceInHours, differenceInMinutes } from "date-fns";
import { uz } from "date-fns/locale";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { DataTableColumnHeader } from "../../../../../components/data-table/data-table-column-header";

import { AddDebtDialog } from "@/features/create-debt/ui";
import { AddPaymentDialog } from "@/features/make-payment/ui";
import { EditDebtorDialog } from "./edit-debtor-dialog";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DebtorView } from "@/types/view";
import { formatDateUz } from "@/lib/format";
import {
  PrintConfirmDialog,
  SingleReceiptTemplate,
  printReceipt,
  type SingleReceiptData,
} from "@/features/receipt-printer";

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
        router.push(`/dashboard/default/debitor/${row.original.externalId}`);
      }}
      className="flex cursor-pointer items-center justify-between gap-2 text-base font-semibold"
    >
      {row.original.firstName}
      <ReminderIndicatorCell row={row} />
    </div>
  );
};

// Cell component for action buttons
const ActionButtonsCell = ({ row, context }: { row: Row<DebtorView>; context?: ColumnsContext }) => {
  const [debtDialogOpen, setDebtDialogOpen] = React.useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = React.useState(false);
  const [printConfirmOpen, setPrintConfirmOpen] = React.useState(false);
  const [pendingReceiptData, setPendingReceiptData] = React.useState<SingleReceiptData | null>(null);
  const [activeReceiptData, setActiveReceiptData] = React.useState<SingleReceiptData | null>(null);

  const handleSuccess = React.useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (receiptInfo?: any) => {
      context?.onDataChange?.();

      if (receiptInfo?.previousBalance !== undefined && receiptInfo.type === "PAYMENT") {
        const receiptData: SingleReceiptData = {
          type: receiptInfo.type,
          docNumber: receiptInfo.docNumber,
          date: new Date(),
          debtorName: receiptInfo.debtorName || `${row.original.firstName} ${row.original.lastName}`,
          debtorPhone: receiptInfo.debtorPhone || row.original.phoneNumber,
          employeeName: receiptInfo.employeeName,
          amount: receiptInfo.amount,
          paymentType: receiptInfo.paymentType,
          description: receiptInfo.description,
          previousBalance: receiptInfo.previousBalance,
          newBalance: receiptInfo.newBalance,
        };
        setPendingReceiptData(receiptData);
        setPrintConfirmOpen(true);
      }
    },
    [context, row.original],
  );

  const handlePrintConfirm = React.useCallback(() => {
    if (pendingReceiptData) {
      setActiveReceiptData(pendingReceiptData);
      printReceipt(pendingReceiptData, () => {
        setPendingReceiptData(null);
      });
    }
  }, [pendingReceiptData]);

  return (
    <>
      <div
        className="flex gap-2"
        onClick={(e) => e.stopPropagation()}
        onPointerDownCapture={(e) => e.stopPropagation()}
        onMouseDownCapture={(e) => e.stopPropagation()}
        onMouseUpCapture={(e) => e.stopPropagation()}
      >
        <Button variant="outline" size="lg" onClick={() => setDebtDialogOpen(true)}>
          <Plus className="h-4 w-4" /> Qarz
        </Button>
        <Button variant="outline" size="lg" onClick={() => setPaymentDialogOpen(true)}>
          <Minus className="h-4 w-4" /> To&apos;lov
        </Button>
      </div>

      <AddDebtDialog
        open={debtDialogOpen}
        onOpenChange={setDebtDialogOpen}
        debtorId={row.original.id}
        debtorName={`${row.original.firstName} ${row.original.lastName}`}
        onSuccess={handleSuccess}
      />

      <AddPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        debtorId={row.original.id}
        debtorName={`${row.original.firstName} ${row.original.lastName}`}
        onSuccess={handleSuccess}
      />

      <PrintConfirmDialog
        open={printConfirmOpen}
        onOpenChange={setPrintConfirmOpen}
        onConfirm={handlePrintConfirm}
        receiptData={pendingReceiptData}
      />

      {activeReceiptData && <SingleReceiptTemplate data={activeReceiptData} />}
    </>
  );
};

// Cell component for reminder indicator
const ReminderIndicatorCell = ({ row }: { row: Row<DebtorView> }) => {
  const reminder = row.original.nextReminder;

  // Track current time for real-time updates
  const [currentTime, setCurrentTime] = React.useState(new Date());

  React.useEffect(() => {
    if (!reminder) return;

    const reminderDate = new Date(reminder.reminderAt);
    const hoursUntilReminder = differenceInHours(reminderDate, currentTime);

    // Update more frequently if reminder is within 24 hours
    const intervalMs = hoursUntilReminder <= 24 ? 30000 : 60000; // 30s if urgent, 1min otherwise

    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, intervalMs);

    return () => clearInterval(interval);
  }, [reminder, currentTime]);

  if (!reminder) {
    return null;
  }

  const reminderDate = new Date(reminder.reminderAt);
  const isOverdue = isPast(reminderDate);
  const isNotified = reminder.status === "NOTIFIED";

  // Calculate time display using current time
  let timeText: string;
  let urgencyClass: string;

  if (isNotified) {
    timeText = `${formatDistanceToNow(reminderDate, { locale: uz })} o'tdi`;
    urgencyClass = "bg-purple-600/15 text-purple-700 dark:text-purple-500";
  } else if (isOverdue) {
    timeText = `${formatDistanceToNow(reminderDate, { locale: uz })} o'tdi`;
    urgencyClass = "bg-red-600/15 text-red-700 dark:text-red-500";
  } else {
    // Calculate total minutes left for accurate display
    const totalMinutesLeft = differenceInMinutes(reminderDate, currentTime);
    const hoursLeft = Math.floor(totalMinutesLeft / 60);
    const daysLeft = Math.floor(hoursLeft / 24);

    if (totalMinutesLeft < 60) {
      // Less than 1 hour - show minutes
      timeText = `${totalMinutesLeft} daqiqa`;
      urgencyClass = "bg-orange-600/15 text-orange-700 dark:text-orange-500";
    } else if (hoursLeft < 24) {
      // Less than 24 hours - show hours (round up if there are extra minutes)
      const displayHours = totalMinutesLeft % 60 > 0 ? hoursLeft + 1 : hoursLeft;
      timeText = `${displayHours} soat`;
      urgencyClass = "bg-yellow-600/15 text-yellow-700 dark:text-yellow-500";
    } else {
      // 24 hours or more - show days (round up if there are extra hours)
      const displayDays = hoursLeft % 24 > 0 ? daysLeft + 1 : daysLeft;
      timeText = `${displayDays} kun`;
      urgencyClass = "bg-blue-600/15 text-blue-700 dark:text-blue-500";
    }
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="default" className={`flex cursor-help items-center gap-1 px-2 py-1 ${urgencyClass}`}>
            {isNotified ? <Bell className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
            <span className="text-xs">{timeText}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="bg-white">
          <div className="text-xs">
            <p className="font-medium text-black">{isNotified ? "Eslatma yuborilgan" : "Eslatma vaqti"}</p>
            <p className="text-muted-foreground">{formatDateUz(reminderDate, true)}</p>
            {reminder.note && <p className="text-muted-foreground mt-1">{reminder.note}</p>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Cell component for dropdown actions
const DropdownActionsCell = ({ row, context }: { row: Row<DebtorView>; context?: ColumnsContext }) => {
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const debtorView: DebtorView = {
    id: row.original.id,
    externalId: row.original.externalId,
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
    id: "index",
    header: ({ column }) => <DataTableColumnHeader className="w-5" column={column} title="№" />,
    cell: ({ row }) => <div>{row.index + 1}</div>,
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "firstName",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Qarzdor" />,
    cell: ({ row }) => <FirstNameCell row={row} />,
    enableSorting: true,
    enableHiding: false,
  },
  {
    accessorKey: "phoneNumber",
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
    accessorKey: "totalDebt",
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
      const redColor = "font-medium bg-red-600/15 text-red-700 dark:text-red-500";
      const greenColor = "font-medium bg-green-600/20 text-green-700 dark:text-green-500";
      const defaultColor = "font-semibold bg-gray-600/15 text-gray-700 dark:text-gray-300 ";
      let color = "";

      if (totalDebt <= 0) {
        variant = "default";
        label = "To'langan";
        color = greenColor;
      } else if (totalDebt > debtLimit) {
        variant = "default";
        label = "Limitdan oshgan";
        color = redColor;
      } else {
        variant = "default";
        label = "Qarzdor";
        color = defaultColor;
      }

      return (
        <div className="flex items-center gap-2">
          <Badge
            variant={"default"}
            className={`h-5 w-5 rounded-full ${row.original.isOverdue ? "bg-red-500" : "bg-green-500"}`}
          ></Badge>
          <Badge variant={variant} className={`h-7 rounded-xl px-2 font-medium ${color}`}>
            {label}
          </Badge>
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
