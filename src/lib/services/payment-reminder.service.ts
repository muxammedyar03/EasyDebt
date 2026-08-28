/**
 * SERVICE LAYER - Payment Reminder Business Logic + Data Access
 *
 * Rules:
 * - DB access only via paymentReminderRepository (entity api)
 * - Returns Domain types, NEVER Prisma types
 * - Handles business logic (calculations, validations)
 */

import type { Prisma } from "@prisma/client";
import { paymentReminderRepository } from "@/entities/payment-reminder/api";
import type {
  PaymentReminderDomain,
  CreatePaymentReminderInput,
  UpdatePaymentReminderInput,
  PaymentReminderFilters,
  PaymentReminderStatus,
} from "@/types/domain/payment-reminder.domain";
import type { PaginationOptions, PaginatedResult } from "@/types/domain/debtor.domain";
import { REMINDER_STATUS_BADGES, type PaymentReminderView } from "@/types/view/payment-reminder.view";
import { format, formatDistanceToNow, isPast } from "date-fns";
import { uz } from "date-fns/locale";

/**
 * Map Prisma PaymentReminder to Domain type
 */
function prismaToDomainReminder(
  reminder: Prisma.PaymentReminderGetPayload<{
    include: { debtor: true; creator: true };
  }>,
): PaymentReminderDomain {
  return {
    id: reminder.id,
    clientId: reminder.client_id,
    debtorId: reminder.debtor_id,
    createdBy: reminder.created_by,
    reminderAt: reminder.reminder_at,
    note: reminder.note,
    status: reminder.status as PaymentReminderStatus,
    notifiedAt: reminder.notified_at,
    createdAt: reminder.created_at,
    updatedAt: reminder.updated_at,
    debtor: reminder.debtor
      ? {
          id: reminder.debtor.id,
          externalId: reminder.debtor.external_id,
          clientId: reminder.client_id,
          firstName: reminder.debtor.first_name,
          lastName: reminder.debtor.last_name,
          phoneNumber: reminder.debtor.phone_number,
          address: reminder.debtor.address,
          totalDebt: reminder.debtor.total_debt.toNumber(),
          isOverdue: reminder.debtor.is_overdue,
          lastPaymentDate: reminder.debtor.last_payment_date,
          riskStatus: "low",
          status: "active",
          daysOverdue: null,
          createdAt: reminder.debtor.created_at,
          updatedAt: reminder.debtor.updated_at,
          createdBy: reminder.debtor.created_by,
        }
      : undefined,
    creator: reminder.creator
      ? {
          id: reminder.creator.id,
          username: reminder.creator.username,
          firstName: reminder.creator.first_name,
          lastName: reminder.creator.last_name,
        }
      : undefined,
  };
}

/**
 * Map Domain to View type
 */
function domainToViewReminder(domain: PaymentReminderDomain): PaymentReminderView {
  const isOverdue = isPast(domain.reminderAt) && domain.status === "PENDING";
  const isPending = domain.status === "PENDING";

  const getTimeUntilFormatted = (): string | null => {
    if (domain.status !== "PENDING") return null;

    const reminderTime = new Date(domain.reminderAt);

    if (isPast(reminderTime)) {
      return `${formatDistanceToNow(reminderTime, { locale: uz })} o'tdi`;
    }
    return `${formatDistanceToNow(reminderTime, { locale: uz })} qoldi`;
  };

  return {
    id: domain.id,
    debtorId: domain.debtorId,
    debtorName: domain.debtor ? `${domain.debtor.firstName} ${domain.debtor.lastName}` : "Noma'lum",
    debtorPhone: domain.debtor?.phoneNumber ?? null,
    reminderAt: domain.reminderAt,
    reminderAtFormatted: format(domain.reminderAt, "d-MMMM yyyy, HH:mm", { locale: uz }),
    reminderTimeFormatted: format(domain.reminderAt, "HH:mm"),
    reminderDateFormatted: format(domain.reminderAt, "d-MMMM yyyy", { locale: uz }),
    note: domain.note,
    status: domain.status,
    statusBadge: REMINDER_STATUS_BADGES[domain.status],
    isOverdue,
    isPending,
    timeUntilReminderFormatted: getTimeUntilFormatted(),
    notifiedAt: domain.notifiedAt,
    notifiedAtFormatted: domain.notifiedAt ? format(domain.notifiedAt, "d-MMMM yyyy, HH:mm", { locale: uz }) : null,
    createdAt: domain.createdAt,
    createdAtFormatted: format(domain.createdAt, "d-MMMM yyyy, HH:mm", { locale: uz }),
    createdBy: domain.createdBy,
    creatorName: domain.creator
      ? `${domain.creator.firstName ?? ""} ${domain.creator.lastName ?? ""}`.trim() || domain.creator.username
      : null,
  };
}

/**
 * Service class for Payment Reminder operations
 */
export class PaymentReminderService {
  /**
   * Find reminder by ID
   */
  async findById(clientId: number, id: number): Promise<PaymentReminderDomain | null> {
    const reminder = await paymentReminderRepository.findFirst({ id, client_id: clientId });
    if (!reminder) return null;
    return prismaToDomainReminder(reminder);
  }

  /**
   * Find reminders with filters and pagination
   */
  async findMany(
    clientId: number,
    filters?: PaymentReminderFilters,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<PaymentReminderDomain>> {
    const where = this.buildWhereClause(clientId, filters);
    const orderBy = this.buildOrderBy(pagination?.sortBy, pagination?.sortOrder);

    const total = await paymentReminderRepository.count(where);

    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 10;
    const skip = (page - 1) * limit;

    const reminders = await paymentReminderRepository.findMany(where, {
      orderBy,
      skip,
      take: limit,
    });

    return {
      data: reminders.map(prismaToDomainReminder),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Find reminders for a specific debtor
   */
  async findByDebtorId(clientId: number, debtorId: number): Promise<PaymentReminderDomain[]> {
    const reminders = await paymentReminderRepository.findMany(
      { client_id: clientId, debtor_id: debtorId },
      { orderBy: { reminder_at: "asc" } },
    );
    return reminders.map(prismaToDomainReminder);
  }

  /**
   * Find pending reminders that are due (for cron job)
   */
  async findDueReminders(clientId?: number): Promise<PaymentReminderDomain[]> {
    const now = new Date();
    const reminders = await paymentReminderRepository.findMany({
      ...(clientId !== undefined ? { client_id: clientId } : {}),
      status: "PENDING",
      reminder_at: { lte: now },
    });
    return reminders.map(prismaToDomainReminder);
  }

  /**
   * Create a new payment reminder
   */
  async create(clientId: number, input: CreatePaymentReminderInput): Promise<PaymentReminderDomain> {
    const reminder = await paymentReminderRepository.create({
      client: { connect: { id: clientId } },
      debtor: { connect: { id: input.debtorId } },
      creator: { connect: { id: input.createdBy } },
      reminder_at: input.reminderAt,
      note: input.note,
      status: "PENDING",
    });
    return prismaToDomainReminder(reminder);
  }

  /**
   * Update a payment reminder
   */
  async update(clientId: number, id: number, input: UpdatePaymentReminderInput): Promise<PaymentReminderDomain> {
    const data: Prisma.PaymentReminderUpdateInput = {};
    if (input.reminderAt !== undefined) data.reminder_at = input.reminderAt;
    if (input.note !== undefined) data.note = input.note;
    if (input.status !== undefined) data.status = input.status;

    const existing = await paymentReminderRepository.findFirst({ id, client_id: clientId });
    if (!existing) throw new Error("Reminder not found");
    const reminder = await paymentReminderRepository.update(id, data);
    return prismaToDomainReminder(reminder);
  }

  /**
   * Mark reminder as notified
   */
  async markAsNotified(id: number): Promise<PaymentReminderDomain> {
    const reminder = await paymentReminderRepository.update(id, {
      status: "NOTIFIED",
      notified_at: new Date(),
    });
    return prismaToDomainReminder(reminder);
  }

  /**
   * Mark reminder as completed
   */
  async markAsCompleted(clientId: number, id: number): Promise<PaymentReminderDomain> {
    const reminder = await paymentReminderRepository.update(id, { status: "COMPLETED" });
    return prismaToDomainReminder(reminder);
  }

  /**
   * Cancel a reminder
   */
  async cancel(clientId: number, id: number): Promise<PaymentReminderDomain> {
    const reminder = await paymentReminderRepository.update(id, { status: "CANCELLED" });
    return prismaToDomainReminder(reminder);
  }

  /**
   * Delete a reminder
   */
  async delete(clientId: number, id: number): Promise<void> {
    const existing = await paymentReminderRepository.findFirst({ id, client_id: clientId });
    if (!existing) throw new Error("Reminder not found");
    await paymentReminderRepository.delete(id);
  }

  /**
   * Get reminders as View types (for UI)
   */
  async getViewByDebtorId(clientId: number, debtorId: number): Promise<PaymentReminderView[]> {
    const reminders = await this.findByDebtorId(clientId, debtorId);
    return reminders.map(domainToViewReminder);
  }

  /**
   * Get single reminder as View type
   */
  async getView(clientId: number, id: number): Promise<PaymentReminderView | null> {
    const domain = await this.findById(clientId, id);
    if (!domain) return null;
    return domainToViewReminder(domain);
  }

  /**
   * Get active (pending) reminder for debtor
   */
  async getActiveReminderForDebtor(clientId: number, debtorId: number): Promise<PaymentReminderDomain | null> {
    const reminder = await paymentReminderRepository.findFirst(
      { client_id: clientId, debtor_id: debtorId, status: "PENDING" },
      { orderBy: { reminder_at: "asc" } },
    );
    if (!reminder) return null;
    return prismaToDomainReminder(reminder);
  }

  /**
   * Build Prisma where clause from filters
   */
  private buildWhereClause(clientId: number, filters?: PaymentReminderFilters): Prisma.PaymentReminderWhereInput {
    const where: Prisma.PaymentReminderWhereInput = { client_id: clientId };

    if (filters?.debtorId) {
      where.debtor_id = filters.debtorId;
    }

    if (filters?.createdBy) {
      where.created_by = filters.createdBy;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.reminderAtFrom || filters?.reminderAtTo) {
      where.reminder_at = {};
      if (filters.reminderAtFrom) {
        where.reminder_at.gte = filters.reminderAtFrom;
      }
      if (filters.reminderAtTo) {
        where.reminder_at.lte = filters.reminderAtTo;
      }
    }

    return where;
  }

  /**
   * Build Prisma orderBy
   */
  private buildOrderBy(sortBy?: string, sortOrder?: "asc" | "desc"): Prisma.PaymentReminderOrderByWithRelationInput {
    const order = sortOrder ?? "asc";

    if (!sortBy) {
      return { reminder_at: order };
    }

    const fieldMap: Record<string, keyof Prisma.PaymentReminderOrderByWithRelationInput> = {
      date: "reminder_at",
      created: "created_at",
      status: "status",
    };

    const field = fieldMap[sortBy] ?? sortBy;
    return { [field]: order } as Prisma.PaymentReminderOrderByWithRelationInput;
  }

  /**
   * Get all active reminders (PENDING and NOTIFIED) grouped by debtor_id
   * Used for dashboard display
   */
  async getActiveRemindersByDebtor(clientId: number): Promise<Map<number, PaymentReminderDomain>> {
    const reminders = await paymentReminderRepository.findMany(
      { client_id: clientId, status: { in: ["PENDING", "NOTIFIED"] } },
      { orderBy: { reminder_at: "asc" } },
    );
    const reminderMap = new Map<number, PaymentReminderDomain>();
    for (const reminder of reminders) {
      if (!reminderMap.has(reminder.debtor_id)) {
        reminderMap.set(reminder.debtor_id, prismaToDomainReminder(reminder));
      }
    }
    return reminderMap;
  }
}

// Export singleton instance
export const paymentReminderService = new PaymentReminderService();
