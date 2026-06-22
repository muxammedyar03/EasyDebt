import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getApiErrorMessage } from "@/lib/errors";
import { createAuditLog } from "@/lib/audit";
import { auditLogRepository, debtorRepository, notificationRepository, userRepository } from "@/entities";
import type { DebtItem } from "@/types/domain";

const RELATED_FETCH_BATCH = 200;

type ExportDebt = {
  external_id: string;
  amount: number;
  description: string | null;
  items: DebtItem[] | null;
  created_at: string;
};

type ExportPayment = {
  external_id: string;
  amount: number;
  payment_type: string;
  note: string | null;
  created_at: string;
};

type ExportDebtor = {
  external_id: string;
  first_name: string;
  last_name: string;
  phone_number: string | null;
  address: string | null;
  debts: ExportDebt[];
  payments: ExportPayment[];
};

type ExportAuditLog = {
  id: number;
  user_id: number | null;
  username: string | null;
  action: string;
  entity_type: string;
  entity_id: number | null;
  old_value: unknown;
  new_value: unknown;
  description: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

type ExportNotification = {
  id: number;
  user_id: number | null;
  username: string | null;
  debtor_id: number | null;
  debtor_external_id: string | null;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

type ExportData = {
  meta: {
    exportedAt: string;
    version: number;
    exportedBy: string;
    debtorsCount: number;
    debtsCount: number;
    paymentsCount: number;
    notificationsCount: number;
    auditLogsCount: number;
  };
  debtors: ExportDebtor[];
  notifications: ExportNotification[];
  auditLogs: ExportAuditLog[];
};

async function fetchAuditLogsForExport(): Promise<ExportAuditLog[]> {
  const all: ExportAuditLog[] = [];
  let skip = 0;
  for (;;) {
    const rows = await auditLogRepository.findMany(
      {},
      {
        take: RELATED_FETCH_BATCH,
        skip,
        orderBy: { id: "asc" },
      },
    );
    if (rows.length === 0) break;

    const userIds = [...new Set(rows.map((r) => r.user_id).filter((id): id is number => id != null))];
    const users = userIds.length
      ? await userRepository.findMany(
          { id: { in: userIds } },
          { select: { id: true, username: true } },
        )
      : [];
    const userMap = new Map(users.map((u) => [u.id, u.username]));

    for (const r of rows) {
      all.push({
        id: r.id,
        user_id: r.user_id,
        username: r.user_id != null ? (userMap.get(r.user_id) ?? null) : null,
        action: r.action,
        entity_type: r.entity_type,
        entity_id: r.entity_id,
        old_value: r.old_value as unknown,
        new_value: r.new_value as unknown,
        description: r.description,
        ip_address: r.ip_address,
        user_agent: r.user_agent,
        created_at: r.created_at.toISOString(),
      });
    }
    skip += RELATED_FETCH_BATCH;
    if (rows.length < RELATED_FETCH_BATCH) break;
  }
  return all;
}

async function fetchNotificationsForExport(): Promise<ExportNotification[]> {
  const all: ExportNotification[] = [];
  let skip = 0;
  for (;;) {
    const rows = await notificationRepository.findMany(
      {},
      {
        take: RELATED_FETCH_BATCH,
        skip,
        orderBy: { id: "asc" },
      },
    );
    if (rows.length === 0) break;

    const userIds = [...new Set(rows.map((r) => r.user_id).filter((id): id is number => id != null))];
    const debtorIds = [...new Set(rows.map((r) => r.debtor_id).filter((id): id is number => id != null))];
    const [users, debtors] = await Promise.all([
      userIds.length
        ? userRepository.findMany(
            { id: { in: userIds } },
            { select: { id: true, username: true } },
          )
        : [],
      debtorIds.length ? debtorRepository.findIdExternalPairs(debtorIds) : [],
    ]);
    const userMap = new Map(users.map((u) => [u.id, u.username]));
    const debtorMap = new Map(debtors.map((d) => [d.id, d.external_id]));

    for (const r of rows) {
      all.push({
        id: r.id,
        user_id: r.user_id,
        username: r.user_id != null ? (userMap.get(r.user_id) ?? null) : null,
        debtor_id: r.debtor_id,
        debtor_external_id: r.debtor_id != null ? (debtorMap.get(r.debtor_id) ?? null) : null,
        type: r.type,
        title: r.title,
        message: r.message,
        is_read: r.is_read,
        created_at: r.created_at.toISOString(),
      });
    }
    skip += RELATED_FETCH_BATCH;
    if (rows.length < RELATED_FETCH_BATCH) break;
  }
  return all;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Faqat SUPER_ADMIN va ADMIN export qila oladi
    if (session.role === "USER") {
      return NextResponse.json({ error: "Faqat admin foydalanuvchilar export qila oladi" }, { status: 403 });
    }

    // Pagination bilan olish (50 tadan)
    const BATCH_SIZE = 50;
    const allDebtors: ExportDebtor[] = [];
    let skip = 0;
    let hasMore = true;

    while (hasMore) {
      const debtors = await debtorRepository.findMany(
        {},
        {
          take: BATCH_SIZE,
          skip,
          orderBy: { created_at: "desc" },
          include: {
            debts: { orderBy: { created_at: "desc" } },
            payments: { orderBy: { created_at: "desc" } },
          },
        },
      );

      if (debtors.length === 0) {
        hasMore = false;
        break;
      }

      type DebtorWithRelations = {
        external_id: string;
        first_name: string;
        last_name: string;
        phone_number: string | null;
        address: string | null;
        debts: {
          external_id: string;
          amount: { toNumber: () => number };
          description: string | null;
          items: unknown;
          created_at: Date;
        }[];
        payments: {
          external_id: string;
          amount: { toNumber: () => number };
          payment_type: string;
          note: string | null;
          created_at: Date;
        }[];
      };
      const formattedDebtors: ExportDebtor[] = debtors.map((debtor) => {
        const d = debtor as unknown as DebtorWithRelations;
        return {
          external_id: d.external_id,
          first_name: d.first_name,
          last_name: d.last_name,
          phone_number: d.phone_number,
          address: d.address,
          debts: d.debts.map((debt) => ({
            external_id: debt.external_id,
            amount: debt.amount.toNumber(),
            description: debt.description,
            items: debt.items as DebtItem[] | null,
            created_at: debt.created_at.toISOString(),
          })),
          payments: d.payments.map((payment) => ({
            external_id: payment.external_id,
            amount: payment.amount.toNumber(),
            payment_type: payment.payment_type,
            note: payment.note,
            created_at: payment.created_at.toISOString(),
          })),
        };
      });

      allDebtors.push(...formattedDebtors);
      skip += BATCH_SIZE;

      if (debtors.length < BATCH_SIZE) {
        hasMore = false;
      }
    }

    // Statistika
    const totalDebts = allDebtors.reduce((sum, d) => sum + d.debts.length, 0);
    const totalPayments = allDebtors.reduce((sum, d) => sum + d.payments.length, 0);

    const [auditLogs, notifications] = await Promise.all([fetchAuditLogsForExport(), fetchNotificationsForExport()]);

    const exportData: ExportData = {
      meta: {
        exportedAt: new Date().toISOString(),
        version: 2,
        exportedBy: session.username,
        debtorsCount: allDebtors.length,
        debtsCount: totalDebts,
        paymentsCount: totalPayments,
        notificationsCount: notifications.length,
        auditLogsCount: auditLogs.length,
      },
      debtors: allDebtors,
      notifications,
      auditLogs,
    };

    await createAuditLog({
      userId: session.userId,
      action: "EXPORT",
      entityType: "DEBTOR",
      newValue: {
        debtorsCount: allDebtors.length,
        debtsCount: totalDebts,
        paymentsCount: totalPayments,
        notificationsCount: notifications.length,
        auditLogsCount: auditLogs.length,
      },
      description: `Qarzdorlar, bildirishnomalar va audit jurnali JSON formatida export qilindi.`,
    });

    return NextResponse.json(exportData);
  } catch (error) {
    console.error("Export JSON error:", error);
    return NextResponse.json({ error: getApiErrorMessage(error) }, { status: 500 });
  }
}
