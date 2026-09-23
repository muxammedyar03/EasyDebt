import { createHash } from "crypto";
import { Prisma } from "@prisma/client";

export class PaymentRequestConflictError extends Error {}

export function debtorPaymentRequestId(clientId: number, actorId: number, key: string): string {
  const hex = createHash("sha256").update(`debtor-payment:${clientId}:${actorId}:${key}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export function samePaymentRequest(
  existing: {
    debtor_id: number;
    amount: Prisma.Decimal;
    payment_type: string;
    note: string | null;
    resets_rating: boolean;
    created_at: Date;
  },
  incoming: {
    debtorId: number;
    amount: number;
    paymentType: string;
    note: string | null;
    resetsRating: boolean;
    createdAt?: Date;
  },
): boolean {
  return (
    existing.debtor_id === incoming.debtorId &&
    existing.amount.equals(incoming.amount) &&
    existing.payment_type === incoming.paymentType &&
    existing.note === incoming.note &&
    existing.resets_rating === incoming.resetsRating &&
    (!incoming.createdAt || existing.created_at.getTime() === incoming.createdAt.getTime())
  );
}
