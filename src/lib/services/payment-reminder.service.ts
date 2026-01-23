/**
 * SERVICE LAYER - Payment Reminder Business Logic + Data Access
 *
 * Rules:
 * - Prisma queries ONLY in this layer
 * - Returns Domain types, NEVER Prisma types
 * - Handles business logic (calculations, validations)
 * - Components/Pages receive Domain or View types
 */

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
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
  async findById(id: number): Promise<PaymentReminderDomain | null> {
    const reminder = await prisma.paymentReminder.findUnique({
      where: { id },
      include: {
        debtor: true,
        creator: true,
      },
    });

    if (!reminder) return null;
    return prismaToDomainReminder(reminder);
  }

  /**
   * Find reminders with filters and pagination
   */
  async findMany(
    filters?: PaymentReminderFilters,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<PaymentReminderDomain>> {
    const where = this.buildWhereClause(filters);
    const orderBy = this.buildOrderBy(pagination?.sortBy, pagination?.sortOrder);

    const total = await prisma.paymentReminder.count({ where });

    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 10;
    const skip = (page - 1) * limit;

    const reminders = await prisma.paymentReminder.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        debtor: true,
        creator: true,
      },
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
  async findByDebtorId(debtorId: number): Promise<PaymentReminderDomain[]> {
    const reminders = await prisma.paymentReminder.findMany({
      where: { debtor_id: debtorId },
      orderBy: { reminder_at: "asc" },
      include: {
        debtor: true,
        creator: true,
      },
    });

    return reminders.map(prismaToDomainReminder);
  }

  /**
   * Find pending reminders that are due (for cron job)
   */
  async findDueReminders(): Promise<PaymentReminderDomain[]> {
    const now = new Date();

    const reminders = await prisma.paymentReminder.findMany({
      where: {
        status: "PENDING",
        reminder_at: {
          lte: now,
        },
      },
      include: {
        debtor: true,
        creator: true,
      },
    });

    return reminders.map(prismaToDomainReminder);
  }

  /**
   * Create a new payment reminder
   */
  async create(input: CreatePaymentReminderInput): Promise<PaymentReminderDomain> {
    const reminder = await prisma.paymentReminder.create({
      data: {
        debtor_id: input.debtorId,
        created_by: input.createdBy,
        reminder_at: input.reminderAt,
        note: input.note,
        status: "PENDING",
      },
      include: {
        debtor: true,
        creator: true,
      },
    });

    return prismaToDomainReminder(reminder);
  }

  /**
   * Update a payment reminder
   */
  async update(id: number, input: UpdatePaymentReminderInput): Promise<PaymentReminderDomain> {
    const data: Prisma.PaymentReminderUpdateInput = {};

    if (input.reminderAt !== undefined) {
      data.reminder_at = input.reminderAt;
    }
    if (input.note !== undefined) {
      data.note = input.note;
    }
    if (input.status !== undefined) {
      data.status = input.status;
    }

    const reminder = await prisma.paymentReminder.update({
      where: { id },
      data,
      include: {
        debtor: true,
        creator: true,
      },
    });

    return prismaToDomainReminder(reminder);
  }

  /**
   * Mark reminder as notified
   */
  async markAsNotified(id: number): Promise<PaymentReminderDomain> {
    const reminder = await prisma.paymentReminder.update({
      where: { id },
      data: {
        status: "NOTIFIED",
        notified_at: new Date(),
      },
      include: {
        debtor: true,
        creator: true,
      },
    });

    return prismaToDomainReminder(reminder);
  }

  /**
   * Mark reminder as completed
   */
  async markAsCompleted(id: number): Promise<PaymentReminderDomain> {
    const reminder = await prisma.paymentReminder.update({
      where: { id },
      data: {
        status: "COMPLETED",
      },
      include: {
        debtor: true,
        creator: true,
      },
    });

    return prismaToDomainReminder(reminder);
  }

  /**
   * Cancel a reminder
   */
  async cancel(id: number): Promise<PaymentReminderDomain> {
    const reminder = await prisma.paymentReminder.update({
      where: { id },
      data: {
        status: "CANCELLED",
      },
      include: {
        debtor: true,
        creator: true,
      },
    });

    return prismaToDomainReminder(reminder);
  }

  /**
   * Delete a reminder
   */
  async delete(id: number): Promise<void> {
    await prisma.paymentReminder.delete({
      where: { id },
    });
  }

  /**
   * Get reminders as View types (for UI)
   */
  async getViewByDebtorId(debtorId: number): Promise<PaymentReminderView[]> {
    const reminders = await this.findByDebtorId(debtorId);
    return reminders.map(domainToViewReminder);
  }

  /**
   * Get single reminder as View type
   */
  async getView(id: number): Promise<PaymentReminderView | null> {
    const domain = await this.findById(id);
    if (!domain) return null;
    return domainToViewReminder(domain);
  }

  /**
   * Get active (pending) reminder for debtor
   */
  async getActiveReminderForDebtor(debtorId: number): Promise<PaymentReminderDomain | null> {
    const reminder = await prisma.paymentReminder.findFirst({
      where: {
        debtor_id: debtorId,
        status: "PENDING",
      },
      orderBy: { reminder_at: "asc" },
      include: {
        debtor: true,
        creator: true,
      },
    });

    if (!reminder) return null;
    return prismaToDomainReminder(reminder);
  }

  /**
   * Build Prisma where clause from filters
   */
  private buildWhereClause(filters?: PaymentReminderFilters): Prisma.PaymentReminderWhereInput {
    const where: Prisma.PaymentReminderWhereInput = {};

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
}

// Export singleton instance
export const paymentReminderService = new PaymentReminderService();
